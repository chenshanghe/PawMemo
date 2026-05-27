import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, Sparkles, Loader2, Save, RefreshCw, BookOpen, MapPin,
  CalendarDays, Check, Wand2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SourceEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  content: string | null;
  mood: string | null;
}

export default function ComposeNarrative() {
  const [, navigate] = useLocation();

  // Parse IDs from ?ids=1,2,3
  const ids: number[] = (() => {
    const raw = new URLSearchParams(window.location.search).get("ids") ?? "";
    return raw.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
  })();

  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [streaming, setStreaming] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [done, setDone] = useState(false);
  const [style, setStyle] = useState("");

  // Save state
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  const narrativeRef = useRef<HTMLTextAreaElement>(null);

  // Load source entries
  useEffect(() => {
    if (!ids.length) { navigate("/entries"); return; }
    (async () => {
      try {
        const res = await fetch("/api/entries", { credentials: "include" });
        if (!res.ok) return;
        const all: SourceEntry[] = await res.json();
        const filtered = all.filter((e) => ids.includes(e.id));
        if (filtered.length < 2) { navigate("/entries"); return; }
        setSources(filtered);
        // Build a default title from destinations
        const destinations = [...new Set(filtered.map((e) => e.destination))];
        setTitle(destinations.join("·") + " 游记");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-scroll textarea while streaming
  useEffect(() => {
    if (narrativeRef.current) {
      narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
    }
  }, [narrative]);

  const compose = async () => {
    if (streaming || !sources.length) return;
    setStreaming(true);
    setDone(false);
    setNarrative("");
    setSaved(false);

    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: ids, style: style.trim() || undefined }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setNarrative(`[错误] ${err.error ?? "AI 服务异常"}`);
        setDone(true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) { setDone(true); break; }
            if (payload.error) { setNarrative((p) => p + `\n[错误] ${payload.error}`); break; }
            if (payload.text) { setNarrative((p) => p + payload.text); }
          } catch {}
        }
      }
      setDone(true);
    } catch (e: any) {
      setNarrative(`[网络错误] ${e.message}`);
      setDone(true);
    } finally {
      setStreaming(false);
    }
  };

  const handleSave = async () => {
    if (!narrative.trim() || !title.trim() || saving) return;
    setSaving(true);

    const sorted = [...sources].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const startDate = sorted[0].startDate;
    const endDate = sorted[sorted.length - 1].endDate ?? sorted[sorted.length - 1].startDate;
    const destinations = [...new Set(sorted.map((e) => e.destination))];

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          destination: destinations.join("·"),
          content: narrative.trim(),
          startDate,
          endDate,
          visibility: "private",
          entryType: "narrative",
          sourceEntryIds: ids,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        setSavedId(data.id);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        </div>
      </Layout>
    );
  }

  const sorted = [...sources].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const dateRange = sorted.length > 0
    ? `${format(new Date(sorted[0].startDate), "yyyy.MM.dd")} — ${format(new Date(sorted[sorted.length - 1].endDate ?? sorted[sorted.length - 1].startDate), "yyyy.MM.dd")}`
    : "";

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in duration-300 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/entries" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />返回
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />AI 合成游记
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">从 {sources.length} 篇随记生成完整旅行文章</p>
          </div>
        </div>

        {/* Source entries */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">来源随记</p>
          <div className="grid grid-cols-1 gap-2">
            {sources.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />{e.destination}
                    <CalendarDays className="w-2.5 h-2.5 ml-1" />{format(new Date(e.startDate), "MM.dd")}
                    {e.mood && <span className="ml-1">{e.mood}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Style prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">写作风格要求（选填）</label>
          <Input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="例如：散文风格、侧重人文体验、突出美食…"
            className="bg-card border-border/50 rounded-xl text-sm"
          />
        </div>

        {/* Compose button */}
        {!done ? (
          <Button
            onClick={compose}
            disabled={streaming}
            className="w-full gap-2 rounded-xl h-11 text-base font-semibold shadow-md"
          >
            {streaming
              ? <><Loader2 className="w-4 h-4 animate-spin" />正在生成…</>
              : <><Wand2 className="w-4 h-4" />开始 AI 合成</>
            }
          </Button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setDone(false); setNarrative(""); setSaved(false); compose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />重新生成
            </button>
          </div>
        )}

        {/* Streaming / result area */}
        {(streaming || narrative) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                {streaming ? "AI 正在创作…" : "生成完成 — 可直接编辑内容"}
              </p>
              {streaming && <span className="flex items-center gap-1 text-xs text-primary"><Loader2 className="w-3 h-3 animate-spin" />生成中</span>}
              {done && !streaming && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3 h-3" />完成</span>}
            </div>
            <Textarea
              ref={narrativeRef}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={16}
              className="resize-none bg-card border-border/50 rounded-xl text-sm leading-7 font-serif"
              readOnly={streaming}
              placeholder="AI 正在生成游记内容…"
            />
          </div>
        )}

        {/* Save section */}
        {done && narrative.trim() && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">保存为游记</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">游记标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 bg-card border-border/50 rounded-xl text-sm font-serif"
                placeholder="给这篇游记起个名字…"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />{dateRange}
              <span className="ml-auto text-[10px]">默认私密，保存后可在旅记中编辑可见性</span>
            </div>

            {saved ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <Check className="w-4 h-4" />已保存为游记
                </div>
                <Link href={`/entries/${savedId}`}>
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />查看
                  </Button>
                </Link>
                <Link href="/entries">
                  <Button size="sm" className="rounded-xl gap-1.5">返回旅记</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full gap-2 rounded-xl h-11 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "保存中…" : "保存游记"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
