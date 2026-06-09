import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  X, Plus, Trash2, Volume2, Square, Copy, Send,
  ChevronDown, Check, Loader2, Sparkles, Eraser,
} from "lucide-react";
import { UpgradeDialog, type QuotaCode } from "@/components/upgrade-dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Conversation { id: number; title: string; createdAt: string }
interface Photo { id: number; url: string; entryId: number; entryTitle: string }
interface EntryCard {
  id: number;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  coverUrl: string | null;
}
interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  entryIds?: number[];
  entryCards?: EntryCard[];
  photos?: Photo[];
}

const QUICK_QUESTIONS = [
  "我去过哪些城市？",
  "最近一次旅行是哪里？",
  "有哪篇日记心情最好？",
  "找找写到海边的日记",
  "帮我总结一下旅行记录",
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const h = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return mobile;
}

export function ChatPanel() {
  const { isSignedIn } = useAuth();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [proChecked, setProChecked] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
  const [clearing, setClearing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Mobile keyboard follow via visualViewport
  useEffect(() => {
    if (!isMobile || !open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0));
      panel.style.height = `${vv.height}px`;
      panel.style.bottom = `${keyboardHeight}px`;
      panel.style.transform = "none";
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      if (panelRef.current) {
        panelRef.current.style.height = "";
        panelRef.current.style.bottom = "";
      }
    };
  }, [isMobile, open]);

  const fetchConversations = useCallback(async (): Promise<boolean> => {
    const r = await fetch(`${BASE}/api/chat/conversations`, { credentials: "include" });
    if (r.status === 403) { setShowUpgrade(true); return false; }
    if (r.ok) {
      const data: Conversation[] = await r.json();
      setConvList(data);
      setProChecked(true);
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
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            entryIds: meta.entryIds,
            entryCards: meta.entryCards,
            photos: meta.photos,
          };
        });
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      }
    } finally { setLoadingConv(false); }
  }, [scrollToBottom]);

  const createConversation = useCallback(async (): Promise<number | null> => {
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
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
  }, [activeConvId]);

  const clearMessages = useCallback(async () => {
    if (!activeConvId || clearing) return;
    setClearing(true);
    setShowConvMenu(false);
    try {
      await fetch(`${BASE}/api/chat/conversations/${activeConvId}/messages`, { method: "DELETE", credentials: "include" });
      setMessages([]);
    } finally { setClearing(false); }
  }, [activeConvId, clearing]);

  const handleOpen = useCallback(async () => {
    if (!proChecked) {
      const ok = await fetchConversations();
      if (!ok) return;
    }
    setOpen(true);
  }, [proChecked, fetchConversations]);

  useEffect(() => {
    if (open && proChecked && !activeConvId && convList.length > 0) {
      const latest = convList[0];
      setActiveConvId(latest.id);
      loadMessages(latest.id);
    }
  }, [open, proChecked, activeConvId, convList, loadMessages]);

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
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
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
      let lineBuffer = "";

      const processLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
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
              entryCards: json.entryCards ?? [],
              photos: json.photos ?? [],
            };
            setMessages(prev => [...prev, aiMsg]);
            setStreamingText("");
            fetchConversations();
            scrollToBottom();
          }
        } catch { /* skip malformed */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const parts = lineBuffer.split("\n");
        lineBuffer = parts.pop() ?? "";
        for (const line of parts) { processLine(line); }
      }
      if (lineBuffer) processLine(lineBuffer);

    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          id: Date.now() + 2, role: "assistant",
          content: "抱歉，服务暂时出错，请稍后重试。",
        }]);
        setStreamingText("");
      }
    } finally {
      setStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [input, streaming, activeConvId, createConversation, fetchConversations, scrollToBottom]);

  const handleStop = () => { abortRef.current?.abort(); };

  const handleCopy = async (id: number, content: string) => {
    await navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleSpeak = async (id: number, content: string) => {
    if (speakingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeakingId(id);
    try {
      const r = await fetch(`${BASE}/api/chat/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: content.slice(0, 500) }),
      });
      if (!r.ok) throw new Error("tts_failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeakingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeakingId(null); URL.revokeObjectURL(url); };
      audio.play().catch(() => setSpeakingId(null));
    } catch {
      // fallback to browser TTS
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(content.slice(0, 500));
      utt.lang = "zh-CN";
      utt.onend = () => setSpeakingId(null);
      utt.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utt);
    }
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

      {/* Upgrade dialog */}
      {showUpgrade && (
        <UpgradeDialog
          code={"CHAT_PRO_ONLY" as QuotaCode}
          tier="free"
          limit={0}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Backdrop (mobile) */}
      {open && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => { setOpen(false); setShowConvMenu(false); }} />
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className={`fixed z-50 bg-background flex flex-col shadow-2xl
            ${isMobile
              ? "inset-x-0 bottom-0 h-[90dvh] rounded-t-2xl border-t border-border/40"
              : "right-0 top-0 h-full w-[400px] border-l border-border/40"
            }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 shrink-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
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
                    onClick={async () => { setShowConvMenu(false); await createConversation(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />新建对话
                  </button>
                  {activeConvId && (
                    <button
                      onClick={clearMessages}
                      disabled={clearing}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      <Eraser className="w-4 h-4" />清空当前对话
                    </button>
                  )}
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
            <button
              onClick={async () => { const id = await createConversation(); if (id) setMessages([]); }}
              title="新建对话"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setOpen(false); setShowConvMenu(false); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {loadingConv && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingConv && messages.length === 0 && !streaming && (
              <EmptyState onQuestion={q => { setInput(q); inputRef.current?.focus(); }} />
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
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                </div>
                <span className="text-sm text-muted-foreground">思考中…</span>
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
                  title="停止生成"
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

        {/* Entry cards — horizontal scroll */}
        {msg.entryCards && msg.entryCards.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none">
            {msg.entryCards.map(card => (
              <Link key={card.id} href={`/entries/${card.id}`}>
                <div className="shrink-0 w-44 rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                  {card.coverUrl ? (
                    <img src={card.coverUrl} alt={card.title} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-muted/60 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-foreground truncate">{card.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.destination}</p>
                    {card.startDate && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {card.startDate}{card.endDate && card.endDate !== card.startDate ? ` — ${card.endDate}` : ""}
                      </p>
                    )}
                  </div>
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

function Lightbox({ photos, idx, onClose, onNav }: {
  photos: Photo[]; idx: number; onClose: () => void; onNav: (i: number) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && idx > 0) onNav(idx - 1);
      if (e.key === "ArrowRight" && idx < photos.length - 1) onNav(idx + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl"
        >‹</button>
      )}
      {idx < photos.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNav(idx + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl"
        >›</button>
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
        {idx + 1} / {photos.length}
      </div>
    </div>
  );
}
