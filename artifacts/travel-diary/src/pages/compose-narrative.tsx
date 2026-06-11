import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, Sparkles, Loader2, Save, RefreshCw, BookOpen, MapPin,
  CalendarDays, Check, Wand2, Tag, Plus, Trash2, Image as ImageIcon,
  CheckSquare, Square, Eye, AlertCircle, X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { WRITING_STYLES } from "@/lib/writing-styles";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SourceEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  content: string | null;
  mood: string | null;
  coverImage?: string | null;
}

interface SourcePhoto {
  id: number;
  entryId: number;
  url: string;
  caption: string | null;
  isVirtual?: boolean;
}

interface StylePreset {
  id: number;
  name: string;
  style: string;
}

interface UpgradeInfo { code: "AI_LIMIT" | "STYLE_LIMIT"; tier: string; limit: number; used?: number }

export default function ComposeNarrative() {
  const [, navigate] = useLocation();

  const ids: number[] = (() => {
    const raw = new URLSearchParams(window.location.search).get("ids") ?? "";
    return raw.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
  })();

  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfo | null>(null);

  // Photos
  const [sourcePhotos, setSourcePhotos] = useState<SourcePhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [photosLoaded, setPhotosLoaded] = useState(false);

  // Style presets
  const [savedStyles, setSavedStyles] = useState<StylePreset[]>([]);
  const [style, setStyle] = useState("");
  const [styleName, setStyleName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  // Compose
  const [streaming, setStreaming] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [done, setDone] = useState(false);

  // Save
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [photoSaveError, setPhotoSaveError] = useState<string | null>(null);

  const narrativeRef = useRef<HTMLTextAreaElement>(null);

  // Compose error + prompt preview
  const [composeError, setComposeError] = useState<string | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [promptData, setPromptData] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [editedUserPrompt, setEditedUserPrompt] = useState("");

  // ── Load sources + presets ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ids.length) { navigate("/entries"); return; }
    (async () => {
      try {
        const [allRes, stylesRes] = await Promise.all([
          fetch(`${BASE}/api/entries`, { credentials: "include" }),
          fetch(`${BASE}/api/me/compose-styles`, { credentials: "include" }),
        ]);
        if (allRes.ok) {
          const all: SourceEntry[] = await allRes.json();
          const filtered = all.filter((e) => ids.includes(e.id));
          if (filtered.length < 2) { navigate("/entries"); return; }
          setSources(filtered);
          const destinations = [...new Set(filtered.map((e) => e.destination))];
          setTitle(destinations.join("·") + " 选集");
        }
        if (stylesRes.ok) setSavedStyles(await stylesRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load photos when sources ready ─────────────────────────────────────────
  useEffect(() => {
    if (!sources.length) return;
    Promise.all(
      sources.map((e) =>
        fetch(`${BASE}/api/entries/${e.id}/photos`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((photos: any[]) => photos.map((p) => ({ ...p, entryId: e.id })))
      )
    ).then((all) => {
      const flat: SourcePhoto[] = all.flat();
      const existingUrls = new Set(flat.map((p) => p.url));
      // Add each source entry's coverImage as a virtual photo if not already present
      sources.forEach((e) => {
        if (e.coverImage && !existingUrls.has(e.coverImage)) {
          flat.push({ id: -(e.id), entryId: e.id, url: e.coverImage, caption: null, isVirtual: true });
          existingUrls.add(e.coverImage);
        }
      });
      setSourcePhotos(flat);
      setSelectedPhotoIds(new Set(flat.map((p) => p.id)));
      setPhotosLoaded(true);
    });
  }, [sources]);

  // Auto-scroll textarea
  useEffect(() => {
    if (narrativeRef.current) narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
  }, [narrative]);

  // ── Compose ─────────────────────────────────────────────────────────────────
  const compose = useCallback(async (overrideUserPrompt?: string) => {
    if (streaming || !sources.length) return;
    setStreaming(true);
    setDone(false);
    setNarrative("");
    setComposeError(null);
    setSaved(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch(`${BASE}/api/ai/compose`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryIds: ids,
          style: style.trim() || undefined,
          ...(overrideUserPrompt !== undefined ? { customUserPrompt: overrideUserPrompt } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 && err.code === "AI_LIMIT") {
          setUpgradeInfo({ code: "AI_LIMIT", tier: err.tier, limit: err.limit, used: err.used });
          setDone(true);
          return;
        }
        setComposeError(err.error ?? "AI 服务异常，请稍后重试");
        setDone(true);
        return;
      }
      if (!res.body) {
        setComposeError("AI 服务异常，请稍后重试");
        setDone(true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      outer: while (true) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.done) { setDone(true); break outer; }
            if (p.error) { setComposeError(p.error); break outer; }
            if (p.text) setNarrative((prev) => prev + p.text);
          } catch {}
        }
      }
      // Extract title from first line if AI produced 【标题】xxx
      setNarrative((prev) => {
        const match = prev.match(/^【标题】(.+)/);
        if (match) {
          setTitle(match[1].trim());
          return prev.replace(/^【标题】.+\n*/, "").replace(/^\n+/, "");
        }
        return prev;
      });
      setDone(true);
    } catch (e: any) {
      if (controller.signal.aborted) {
        setComposeError("合成超时（等待超过 90 秒），AI 服务可能繁忙，请稍后重试");
      } else {
        setComposeError("网络错误，请检查网络连接后重试");
      }
      setDone(true);
    } finally {
      clearTimeout(timeoutId);
      setStreaming(false);
    }
  }, [streaming, sources, ids, style]);

  // ── Prompt preview ───────────────────────────────────────────────────────────
  const loadPromptPreview = async () => {
    if (!ids.length) return;
    setPromptData(null);
    setLoadingPrompt(true);
    setShowPromptDialog(true);
    try {
      const res = await fetch(`${BASE}/api/ai/compose-prompt`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: ids, style: style.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromptData(data);
        setEditedUserPrompt(data.userPrompt);
      }
    } catch {}
    setLoadingPrompt(false);
  };

  // ── Style presets ────────────────────────────────────────────────────────────
  const savePreset = async () => {
    if (!styleName.trim() || !style.trim() || savingPreset) return;
    setSavingPreset(true);
    try {
      const res = await fetch(`${BASE}/api/me/compose-styles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: styleName.trim(), style: style.trim() }),
      });
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        if (err.code === "STYLE_LIMIT") {
          setUpgradeInfo({ code: "STYLE_LIMIT", tier: err.tier, limit: err.limit });
          return;
        }
      }
      if (res.ok) {
        const p = await res.json();
        setSavedStyles((prev) => [...prev, p]);
        setStyleName("");
        setShowSavePreset(false);
      }
    } finally {
      setSavingPreset(false);
    }
  };

  const deletePreset = async (id: number) => {
    const res = await fetch(`${BASE}/api/me/compose-styles/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setSavedStyles((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Toggle photo selection ────────────────────────────────────────────────
  const togglePhoto = (id: number) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!narrative.trim() || !title.trim() || saving) return;
    setSaving(true);
    setPhotoSaveError(null);
    const sorted = [...sources].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const startDate = sorted[0].startDate;
    const endDate = sorted[sorted.length - 1].endDate ?? sorted[sorted.length - 1].startDate;
    const destinations = [...new Set(sorted.map((e) => e.destination))];

    // Determine best cover image: first selected photo URL, or first source coverImage
    const firstSelectedPhoto = sourcePhotos.find((p) => selectedPhotoIds.has(p.id));
    const coverImage = firstSelectedPhoto?.url ?? sorted.find((e) => e.coverImage)?.coverImage ?? null;

    try {
      const res = await fetch(`${BASE}/api/entries`, {
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
          ...(coverImage ? { coverImage } : {}),
        }),
      });
      if (!res.ok) return;
      const data = await res.json();

      // Copy selected photos with section markers [s:N]: so NarrativeContent
      // can place each photo next to its source entry's section
      const sortedSourceIds = sorted.map((e) => e.id);
      const photosToCopy = sourcePhotos
        .filter((p) => selectedPhotoIds.has(p.id))
        .map((p) => {
          const sectionIdx = sortedSourceIds.indexOf(p.entryId);
          const prefix = sectionIdx >= 0 ? `[s:${sectionIdx}]:` : "";
          const caption = p.caption ? `${prefix}${p.caption}` : (prefix || null);
          return { url: p.url, caption };
        });
      if (photosToCopy.length > 0) {
        const photoRes = await fetch(`${BASE}/api/entries/${data.id}/photos/batch`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: photosToCopy }),
        });
        if (!photoRes.ok) {
          const photoErr = await photoRes.json().catch(() => ({}));
          if (photoErr.code === "PHOTO_LIMIT") {
            setPhotoSaveError(`照片超出上限（${photoErr.limit} 张），选集已保存但未附带图片`);
          } else {
            setPhotoSaveError("图片保存失败，选集已保存但未附带图片，可进入选集后手动上传");
          }
        }
      }

      setSaved(true);
      setSavedId(data.id);
      // Auto-navigate to the saved narrative after a short delay
      setTimeout(() => navigate(`/entries/${data.id}`), 800);
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
      <div className="space-y-6 animate-in fade-in duration-300 pb-24 md:pb-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/entries" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />返回
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />AI 合成随记成选集
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

        {/* Style selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">写作风格要求（选填）</label>
            <button
              onClick={() => setShowSavePreset((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              <Tag className="w-3 h-3" />保存为预设
            </button>
          </div>

          {/* Built-in style presets */}
          <div className="flex flex-wrap gap-1.5">
            {WRITING_STYLES.map((s) => {
              const active = style === s.prompt;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setStyle(active ? "" : s.prompt)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
                  )}
                >
                  <span>{s.emoji}</span>
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* User-saved preset chips */}
          {savedStyles.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {savedStyles.map((s) => (
                <div key={s.id} className="group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs transition-colors cursor-pointer border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5">
                  <span
                    className="text-foreground"
                    onClick={() => setStyle(s.style)}
                  >{s.name}</span>
                  <button
                    onClick={() => deletePreset(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="例如：散文风格、侧重人文体验、突出美食与街头气息…"
            rows={2}
            className="bg-card border-border/50 rounded-xl text-sm resize-none"
          />

          {/* Save preset inline */}
          {showSavePreset && (
            <div className="flex gap-2 items-center p-3 rounded-xl border border-primary/20 bg-primary/5">
              <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
              <Input
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="给这个风格取个名字…"
                className="h-7 text-xs bg-background border-border/50 flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") savePreset(); }}
              />
              <button
                onClick={savePreset}
                disabled={savingPreset || !styleName.trim() || !style.trim()}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                  styleName.trim() && style.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                {savingPreset ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                保存
              </button>
              <button onClick={() => setShowSavePreset(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>

        {/* Compose button + prompt preview */}
        <div className="flex items-center gap-2">
          {!done ? (
            <Button onClick={() => compose()} disabled={streaming} className="flex-1 gap-2 rounded-xl h-11 text-base font-semibold shadow-md">
              {streaming
                ? <><Loader2 className="w-4 h-4 animate-spin" />正在生成…</>
                : <><Wand2 className="w-4 h-4" />开始 AI 合成</>
              }
            </Button>
          ) : (
            <button
              onClick={() => { setComposeError(null); setDone(false); setNarrative(""); setSaved(false); compose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />重新生成
            </button>
          )}
          <button
            onClick={loadPromptPreview}
            disabled={streaming || !sources.length}
            title="查看并微调 AI 提示词"
            className="flex items-center gap-1.5 px-3 h-11 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">提示词</span>
          </button>
        </div>

        {/* Compose error card */}
        {composeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">合成失败</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">{composeError}</p>
            </div>
            <button
              onClick={() => { setComposeError(null); setDone(false); setNarrative(""); compose(); }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />重试
            </button>
          </div>
        )}

        {/* Streaming output */}
        {(streaming || narrative) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                {streaming ? "AI 正在创作…" : "生成完成 — 可直接编辑"}
              </p>
              {streaming && <span className="flex items-center gap-1 text-xs text-primary"><Loader2 className="w-3 h-3 animate-spin" />生成中</span>}
              {done && !streaming && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3 h-3" />完成</span>}
            </div>
            <Textarea
              ref={narrativeRef}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={18}
              className="resize-none bg-card border-border/50 rounded-xl text-sm leading-7 font-serif"
              readOnly={streaming}
            />
          </div>
        )}

        {/* Photo selection grouped by source entry */}
        {done && photosLoaded && sourcePhotos.length > 0 && (() => {
          const sortedSources = [...sources].sort((a, b) => a.startDate.localeCompare(b.startDate));
          const totalSelected = selectedPhotoIds.size;
          const totalPhotos = sourcePhotos.length;
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  选择配图（按来源随记分组）— 已选 {totalSelected}/{totalPhotos}
                </p>
                <div className="flex gap-2 text-[11px]">
                  <button onClick={() => setSelectedPhotoIds(new Set(sourcePhotos.map((p) => p.id)))} className="text-primary hover:underline">全选</button>
                  <button onClick={() => setSelectedPhotoIds(new Set())} className="text-muted-foreground hover:underline">清空</button>
                </div>
              </div>

              {sortedSources.map((src, sIdx) => {
                const entryPhotos = sourcePhotos.filter((p) => p.entryId === src.id);
                if (entryPhotos.length === 0) return null;
                const allSel = entryPhotos.every((p) => selectedPhotoIds.has(p.id));
                return (
                  <div key={src.id} className="space-y-2 p-3 rounded-xl border border-border/30 bg-card/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">第{sIdx + 1}段</span>
                        <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{src.title}</span>
                        <span className="text-[10px] text-muted-foreground">{src.destination}</span>
                      </div>
                      <button
                        onClick={() => {
                          const ids = new Set(selectedPhotoIds);
                          entryPhotos.forEach((p) => (allSel ? ids.delete(p.id) : ids.add(p.id)));
                          setSelectedPhotoIds(ids);
                        }}
                        className="text-[11px] text-primary hover:underline shrink-0"
                      >
                        {allSel ? "取消全选" : "全选"}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {entryPhotos.map((p) => {
                        const sel = selectedPhotoIds.has(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePhoto(p.id)}
                            className={cn(
                              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                              sel ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-55 hover:opacity-80",
                            )}
                          >
                            <img src={p.url} alt={p.caption || "旅行照片"} className="w-full h-full object-cover" />
                            <div className={cn(
                              "absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white transition-all",
                              sel ? "bg-primary" : "bg-black/40",
                            )}>
                              {sel ? <CheckSquare className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">每段随记的照片将紧跟该段文字显示</p>
            </div>
          );
        })()}

        {/* Save section */}
        {done && narrative.trim() && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">保存为选集</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">选集标题</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 bg-card border-border/50 rounded-xl text-sm font-serif" placeholder="给这篇选集起个名字…" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />{dateRange}
              <span className="ml-auto text-[10px]">默认私密，保存后可编辑可见性</span>
            </div>
            {photoSaveError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{photoSaveError}</span>
              </div>
            )}
            {saved ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <Check className="w-4 h-4" />已保存，正在跳转…
                </span>
                <Link href={`/entries/${savedId}`}>
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />立即查看
                  </Button>
                </Link>
              </div>
            ) : (
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full gap-2 rounded-xl h-11 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "保存中…" : `保存选集${selectedPhotoIds.size > 0 ? `（含 ${selectedPhotoIds.size} 张图）` : ""}`}
              </Button>
            )}
          </div>
        )}
      </div>
      {upgradeInfo && (
        <UpgradeDialog
          code={upgradeInfo.code}
          tier={upgradeInfo.tier}
          limit={upgradeInfo.limit}
          onClose={() => setUpgradeInfo(null)}
        />
      )}

      {/* Prompt preview / edit dialog */}
      {showPromptDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPromptDialog(false); }}
        >
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
              <div>
                <h3 className="font-semibold text-foreground">AI 提示词预览</h3>
                <p className="text-xs text-muted-foreground mt-0.5">查看将要发给 AI 的内容，可在此微调后再合成</p>
              </div>
              <button
                onClick={() => setShowPromptDialog(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {loadingPrompt ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : promptData ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      系统指令（只读）
                    </label>
                    <Textarea
                      value={promptData.systemPrompt}
                      readOnly
                      rows={8}
                      className="bg-muted/40 border-border/40 rounded-xl text-xs font-mono leading-relaxed resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                      用户提示词（可编辑）
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      日记正文已嵌入末尾；你可在开头添加额外要求，或直接修改后点击「以此合成」
                    </p>
                    <Textarea
                      value={editedUserPrompt}
                      onChange={(e) => setEditedUserPrompt(e.target.value)}
                      rows={14}
                      className="bg-card border-border/50 rounded-xl text-xs font-mono leading-relaxed resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  加载提示词失败，请关闭后重试
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/40 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowPromptDialog(false)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                关闭
              </button>
              <Button
                disabled={loadingPrompt || !editedUserPrompt.trim()}
                onClick={() => {
                  setShowPromptDialog(false);
                  setComposeError(null);
                  setDone(false);
                  setNarrative("");
                  setSaved(false);
                  compose(editedUserPrompt);
                }}
                className="gap-2 rounded-xl"
              >
                <Wand2 className="w-4 h-4" />
                以此合成
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
