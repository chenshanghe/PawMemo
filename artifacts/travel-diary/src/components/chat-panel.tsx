import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  MessageCircle, X, Plus, Trash2, Volume2, Square, Copy, Send,
  ChevronDown, Check, Loader2, AlertCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Conversation { id: number; title: string; createdAt: string }
interface Photo { id: number; url: string; entryId: number; entryTitle: string }
interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  entryIds?: number[];
  photos?: Photo[];
}

const QUICK_QUESTIONS = [
  "我去过哪些城市？",
  "最近一次旅行是哪里？",
  "有哪篇日记心情最好？",
  "找找写到海边的照片",
  "帮我总结一下旅行记录",
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function ChatPanel() {
  const { isSignedIn } = useAuth();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [proStatus, setProStatus] = useState<"unknown" | "pro" | "free">("unknown");
  const [convList, setConvList] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; idx: number } | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const fetchConversations = useCallback(async () => {
    const r = await fetch(`${BASE}/api/chat/conversations`, { credentials: "include" });
    if (r.status === 403) { setProStatus("free"); return false; }
    if (r.ok) {
      setProStatus("pro");
      const data: Conversation[] = await r.json();
      setConvList(data);
      return true;
    }
    return false;
  }, []);

  const loadMessages = useCallback(async (convId: number) => {
    setLoadingConv(true);
    setMessages([]);
    try {
      const r = await fetch(`${BASE}/api/chat/conversations/${convId}/messages`, { credentials: "include" });
      if (r.ok) {
        const raw = await r.json();
        const msgs: ChatMessage[] = raw.map((m: any) => {
          let meta: any = {};
          try { meta = m.metadata ? JSON.parse(m.metadata) : {}; } catch {}
          return { id: m.id, role: m.role, content: m.content, entryIds: meta.entryIds, photos: meta.photos };
        });
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      }
    } finally { setLoadingConv(false); }
  }, [scrollToBottom]);

  const createConversation = useCallback(async () => {
    const r = await fetch(`${BASE}/api/chat/conversations`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const conv: Conversation = await r.json();
      setConvList(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      return conv.id;
    }
    return null;
  }, []);

  const deleteConversation = useCallback(async (id: number) => {
    await fetch(`${BASE}/api/chat/conversations/${id}`, { method: "DELETE", credentials: "include" });
    setConvList(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [activeConvId]);

  const handleOpen = useCallback(async () => {
    if (proStatus === "free") { setOpen(true); return; }
    const ok = await fetchConversations();
    if (!ok) { setOpen(true); return; }
    setOpen(true);
  }, [proStatus, fetchConversations]);

  useEffect(() => {
    if (open && proStatus === "pro" && !activeConvId && convList.length > 0) {
      const latest = convList[0];
      setActiveConvId(latest.id);
      loadMessages(latest.id);
    }
  }, [open, proStatus, activeConvId, convList, loadMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    const userMsg: ChatMessage = { id: Date.now(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    scrollToBottom();

    abortRef.current = new AbortController();
    let accumulated = "";

    try {
      const resp = await fetch(`${BASE}/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("请求失败");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.error) throw new Error(json.error);
            if (json.text) {
              accumulated += json.text;
              setStreamingText(accumulated);
              scrollToBottom();
            }
            if (json.done) {
              const aiMsg: ChatMessage = {
                id: Date.now() + 1,
                role: "assistant",
                content: accumulated,
                entryIds: json.entryIds ?? [],
                photos: json.photos ?? [],
              };
              setMessages(prev => [...prev, aiMsg]);
              setStreamingText("");
              // refresh conversation list (title may have changed)
              fetchConversations().then(() => {});
              scrollToBottom();
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          id: Date.now() + 2, role: "assistant",
          content: "抱歉，服务暂时出错，请稍后重试。",
        }]);
      }
    } finally {
      setStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [input, streaming, activeConvId, createConversation, fetchConversations, scrollToBottom]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleQuickQuestion = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  const handleCopy = async (id: number, content: string) => {
    await navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleSpeak = (id: number, content: string) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(content);
    utt.lang = "zh-CN";
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utt);
    setSpeakingId(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const switchConv = (conv: Conversation) => {
    setActiveConvId(conv.id);
    loadMessages(conv.id);
    setShowConvMenu(false);
  };

  if (!isSignedIn) return null;

  const activeConv = convList.find(c => c.id === activeConvId);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label="AI 日记助手"
        className={`fixed z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all ${isMobile ? "bottom-20 right-4" : "bottom-6 right-6"} ${open ? "opacity-0 pointer-events-none" : ""}`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Backdrop (mobile only) */}
      {open && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      {open && (
        <div
          className={`fixed z-50 bg-background flex flex-col shadow-2xl transition-all
            ${isMobile
              ? "inset-x-0 bottom-0 h-[92dvh] rounded-t-2xl border-t border-border/40"
              : "right-0 top-0 h-full w-[400px] border-l border-border/40"
            }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 shrink-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />

            {proStatus === "pro" ? (
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowConvMenu(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors max-w-full"
                >
                  <span className="truncate">{activeConv?.title ?? "AI 日记助手"}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </button>
                {showConvMenu && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg z-10 py-1 max-h-72 overflow-y-auto">
                    <button
                      onClick={async () => { setShowConvMenu(false); await createConversation(); setMessages([]); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />新对话
                    </button>
                    <div className="h-px bg-border/40 my-1" />
                    {convList.map(c => (
                      <div key={c.id} className="flex items-center group">
                        <button
                          onClick={() => switchConv(c)}
                          className={`flex-1 text-left px-3 py-2 text-sm truncate hover:bg-muted/60 transition-colors ${c.id === activeConvId ? "text-primary font-medium" : "text-foreground"}`}
                        >
                          {c.title}
                        </button>
                        <button
                          onClick={() => deleteConversation(c.id)}
                          className="opacity-0 group-hover:opacity-100 px-2 py-2 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {convList.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">暂无历史对话</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="flex-1 text-sm font-medium">AI 日记助手</span>
            )}

            {proStatus === "pro" && (
              <button
                onClick={async () => { const id = await createConversation(); if (id) { setMessages([]); } }}
                title="新建对话"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { setOpen(false); setShowConvMenu(false); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {proStatus === "free" ? (
            <UpgradePrompt />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {loadingConv && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loadingConv && messages.length === 0 && !streaming && (
                  <EmptyState onQuestion={handleQuickQuestion} />
                )}

                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    copied={copied}
                    speakingId={speakingId}
                    onCopy={handleCopy}
                    onSpeak={handleSpeak}
                    onPhoto={(photos, idx) => setLightbox({ photos, idx })}
                  />
                ))}

                {/* Streaming bubble */}
                {streaming && streamingText && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 max-w-[85%]">
                      <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {streamingText}
                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                      </div>
                    </div>
                  </div>
                )}
                {streaming && !streamingText && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-muted-foreground">
                      思考中…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 px-4 py-3 border-t border-border/40 bg-background">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="问问你的旅行日记…"
                    rows={1}
                    disabled={streaming}
                    className="flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 max-h-28 leading-relaxed"
                    style={{ minHeight: "42px" }}
                    onInput={e => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 112) + "px";
                    }}
                  />
                  {streaming ? (
                    <button
                      onClick={handleStop}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          idx={lightbox.idx}
          onClose={() => setLightbox(null)}
          onNav={idx => setLightbox(prev => prev ? { ...prev, idx } : null)}
        />
      )}
    </>
  );
}

function EmptyState({ onQuestion }: { onQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center py-6 gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">AI 日记助手</p>
        <p className="text-xs text-muted-foreground mt-1">用自然语言查找和回忆你的旅行记录</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-1">
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onQuestion(q)}
            className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  msg, copied, speakingId, onCopy, onSpeak, onPhoto,
}: {
  msg: ChatMessage;
  copied: number | null;
  speakingId: number | null;
  onCopy: (id: number, content: string) => void;
  onSpeak: (id: number, content: string) => void;
  onPhoto: (photos: Photo[], idx: number) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>

        {/* Entry cards */}
        {msg.entryIds && msg.entryIds.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {msg.entryIds.map(id => (
              <Link key={id} href={`/entries/${id}`}>
                <div className="shrink-0 w-32 rounded-xl border border-border/50 bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-primary/4 transition-colors cursor-pointer">
                  <p className="text-[11px] font-medium text-foreground truncate">日记 #{id}</p>
                  <p className="text-[10px] text-primary mt-0.5">查看详情 →</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Photos grid */}
        {msg.photos && msg.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {msg.photos.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => onPhoto(msg.photos!, idx)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
              >
                <img src={p.url} alt={p.entryTitle} className="w-full h-full object-cover" />
                {p.entryTitle && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5">
                    <p className="text-[9px] text-white truncate">{p.entryTitle}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 pl-0.5">
          <button
            onClick={() => onSpeak(msg.id, msg.content)}
            title={speakingId === msg.id ? "停止朗读" : "朗读"}
            className={`p-1.5 rounded-lg transition-colors ${speakingId === msg.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            {speakingId === msg.id ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onCopy(msg.id, msg.content)}
            title="复制"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {copied === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradePrompt() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">AI 日记助手</p>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          升级到「探索家 Pro」或「旅记大师 Plus」<br />即可用自然语言查询所有日记、搜索照片
        </p>
      </div>
      <div className="w-full space-y-2">
        <Link href="/pricing">
          <Button className="w-full">查看升级套餐</Button>
        </Link>
      </div>
      <div className="space-y-1 text-left w-full">
        {["自然语言搜索所有旅行日记", "AI 智能回答和日记摘要", "图片搜索结果展示", "朗读 AI 回答内容"].map(f => (
          <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ photos, idx, onClose, onNav }: {
  photos: Photo[]; idx: number; onClose: () => void; onNav: (i: number) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && idx > 0) onNav(idx - 1);
      if (e.key === "ArrowRight" && idx < photos.length - 1) onNav(idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, photos.length, onClose, onNav]);

  const photo = photos[idx];
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
        <X className="w-6 h-6" />
      </button>
      <img
        src={photo.url}
        alt={photo.entryTitle}
        className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
      {photo.entryTitle && (
        <p className="absolute bottom-6 text-white/80 text-sm">{photo.entryTitle}</p>
      )}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onNav(idx - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          ‹
        </button>
      )}
      {idx < photos.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNav(idx + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          ›
        </button>
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
        {idx + 1} / {photos.length}
      </div>
    </div>
  );
}
