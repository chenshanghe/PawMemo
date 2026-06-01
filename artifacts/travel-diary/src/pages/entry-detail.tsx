import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import { SocialPanel } from "@/components/social-panel";
import {
  useGetEntry,
  useDeleteEntry,
  useDeletePhoto,
  useUpdateEntry,
  getListEntriesQueryKey,
  getGetEntryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MapPin, CalendarDays, Star, Pencil, Trash2, ArrowLeft, X, ChevronLeft, ChevronRight,
  Sparkles, Loader2, Check, RotateCcw, Users, Lock, Globe, Link2, ChevronDown,
} from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { WRITING_STYLES } from "@/lib/writing-styles";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-800",
  平静: "bg-blue-100 text-blue-800",
  感动: "bg-pink-100 text-pink-800",
  疲惫: "bg-gray-100 text-gray-700",
  兴奋: "bg-orange-100 text-orange-800",
  思念: "bg-purple-100 text-purple-800",
};

function Lightbox({ photos, index, onClose }: { photos: { url: string; caption?: string | null }[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const photo = photos[current];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm tabular-nums">
        {current + 1} / {photos.length}
      </span>
      {photos.length > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img
        src={photo.url}
        alt={photo.caption ?? ""}
        className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      {photo.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full whitespace-nowrap">
          {photo.caption}
        </p>
      )}
    </div>
  );
}

export default function EntryDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();

  const { data: entry, isLoading } = useGetEntry(id, {
    query: { enabled: !!id, queryKey: getGetEntryQueryKey(id) },
  });
  const deleteEntry = useDeleteEntry();
  const deletePhoto = useDeletePhoto();
  const updateEntry = useUpdateEntry();

  // Visibility switcher
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visibilityOpen) return;
    const handler = (e: MouseEvent) => {
      if (visibilityRef.current && !visibilityRef.current.contains(e.target as Node)) {
        setVisibilityOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visibilityOpen]);

  const handleUpdateVisibility = (v: "private" | "public" | "shared") => {
    if (visibilityUpdating || (entry as any)?.visibility === v) { setVisibilityOpen(false); return; }
    setVisibilityUpdating(true);
    setVisibilityOpen(false);
    updateEntry.mutate(
      { id, data: { visibility: v } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
        },
        onSettled: () => setVisibilityUpdating(false),
      }
    );
  };

  // AI state
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // AI enhance usage quota
  const [enhanceUsed, setEnhanceUsed] = useState<number | null>(null);
  const [enhanceLimit, setEnhanceLimit] = useState<number>(5);

  useEffect(() => {
    fetch("/api/me/subscription", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setEnhanceUsed(d.aiEnhancedThisMonth ?? 0);
          setEnhanceLimit(d.aiEnhanceLimit ?? 5);
        }
      })
      .catch(() => {});
  }, []);

  const handleDeleteEntry = () => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
        setLocation("/entries");
      },
    });
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhoto.mutate({ photoId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(id) });
      },
    });
  };

  const handleAiEnhance = async () => {
    if (!entry?.content?.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiDraft("");

    abortRef.current = new AbortController();
    let accumulated = "";

    try {
      const token = await getToken();
      const resp = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ content: entry.content, instruction: aiInstruction }),
        signal: abortRef.current.signal,
      });

      if (resp.status === 403) {
        const err = await resp.json().catch(() => ({}));
        if (err.code === "AI_ENHANCE_LIMIT") {
          setEnhanceUsed(err.used ?? enhanceLimit);
          setAiDraft(null);
          return;
        }
      }

      if (!resp.ok || !resp.body) throw new Error("请求失败");

      setEnhanceUsed((prev) => (prev !== null ? prev + 1 : null));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));
          if (json.error) throw new Error(json.error);
          if (json.done) break;
          if (json.text) {
            accumulated += json.text;
            setAiDraft(accumulated);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setAiError(err.message ?? "AI 优化失败，请稍后重试");
        setAiDraft(null);
      }
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  };

  const handleApplyDraft = () => {
    if (!aiDraft || !entry) return;
    updateEntry.mutate(
      { id, data: { content: aiDraft } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEntryQueryKey(id) });
          setAiDraft(null);
          setAiInstruction("");
        },
      }
    );
  };

  const handleDiscardDraft = () => {
    abortRef.current?.abort();
    setAiDraft(null);
    setAiError(null);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
          <Skeleton className="h-8 w-48 bg-muted/40" />
          <Skeleton className="h-72 w-full rounded-2xl bg-muted/40" />
          <Skeleton className="h-6 w-64 bg-muted/40" />
          <Skeleton className="h-48 w-full bg-muted/40" />
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-xl font-serif font-bold mb-2">日记不存在</h3>
          <p className="text-muted-foreground text-sm mb-6">该日记可能已被删除。</p>
          <Link href="/entries"><Button variant="outline">返回日记列表</Button></Link>
        </div>
      </Layout>
    );
  }

  const travelDays = entry.endDate
    ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  const photos = entry?.photos ?? [];

  return (
    <Layout>
      {lightboxIndex !== null && (
        <Lightbox photos={photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link href="/entries">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(`/entries/${id}/print`, "_blank")}
            >
              📄 导出 PDF
            </Button>
            <Link href={`/entries/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除日记</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除「{entry.title}」吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Cover */}
        {entry.coverImage && (
          <div className="rounded-2xl overflow-hidden aspect-[21/9] shadow-lg">
            <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-4">
          <h1 className="text-4xl font-serif font-bold text-foreground leading-tight">{entry.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{entry.destination}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{format(new Date(entry.startDate), 'yyyy年MM月dd日')}</span>
              {entry.endDate && <span> — {format(new Date(entry.endDate), 'MM月dd日')}</span>}
              <span className="text-primary ml-1">{travelDays} 天</span>
            </div>
            {entry.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < entry.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            {entry.mood && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>
                {entry.mood}
              </span>
            )}
            {entry.companions && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0" />
                <span>{entry.companions}</span>
              </div>
            )}
            {(entry as any).weather && (() => {
              const w = (entry as any).weather as { icon: string; desc: string; tempMax: number; tempMin: number };
              return (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium">
                  {w.icon} {w.desc} {w.tempMax}°/{w.tempMin}°C
                </span>
              );
            })()}
            {(() => {
              const v: "private" | "public" | "shared" = (entry as any).visibility ?? "private";
              const isOwner = !!user && entry.userId === user.id;
              const opts = [
                { value: "private" as const, Icon: Lock,  label: "私密",     cls: "text-muted-foreground bg-muted/40 border-border/50", optCls: "hover:bg-muted/60" },
                { value: "shared"  as const, Icon: Link2, label: "分享可见",  cls: "text-blue-600 bg-blue-50 border-blue-200",            optCls: "hover:bg-blue-50" },
                { value: "public"  as const, Icon: Globe, label: "公开",      cls: "text-green-600 bg-green-50 border-green-200",          optCls: "hover:bg-green-50" },
              ];
              const cur = opts.find((o) => o.value === v) ?? opts[0];

              if (!isOwner) {
                return (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cur.cls}`}>
                    <cur.Icon className="w-3 h-3" />
                    {cur.label}
                  </span>
                );
              }

              return (
                <div ref={visibilityRef} className="relative">
                  <button
                    onClick={() => setVisibilityOpen((o) => !o)}
                    disabled={visibilityUpdating}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity ${cur.cls} ${visibilityUpdating ? "opacity-50" : "hover:opacity-80"}`}
                  >
                    {visibilityUpdating
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <cur.Icon className="w-3 h-3" />}
                    {cur.label}
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                  {visibilityOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-popover border border-border/60 rounded-xl shadow-lg py-1 min-w-[9rem] animate-in fade-in slide-in-from-top-1 duration-150">
                      {opts.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleUpdateVisibility(opt.value)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${opt.optCls} ${opt.value === v ? "font-semibold" : ""}`}
                        >
                          <opt.Icon className="w-3.5 h-3.5 shrink-0" />
                          {opt.label}
                          {opt.value === v && <Check className="w-3 h-3 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-border/50 text-muted-foreground">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Social: likes, comments, share */}
        <SocialPanel
          entryId={id}
          isOwner={!!user && entry.userId === user.id}
          visibility={(entry as any).visibility ?? "private"}
        />

        {/* Content — narrative entries get 图文混排, regular entries get photo grid + plain text */}
        {(entry as any).entryType === "narrative" && entry.content ? (
          <NarrativeContent
            content={entry.content}
            photos={photos}
            lightboxIndex={lightboxIndex}
            onPhotoClick={setLightboxIndex}
            onDeletePhoto={handleDeletePhoto}
            entryId={id}
          />
        ) : (
          <>
            {/* Photos grid for regular entries */}
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold text-foreground">旅途照片</h2>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, idx) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl shadow-sm bg-muted/30">
                      <img
                        src={photo.url}
                        alt={photo.caption ?? "旅途照片"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs">{photo.caption}</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <PhotoUploader entryId={id} />
            </div>

            {entry.content && (
              <div className="space-y-3">
                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif text-base">
                      {entry.content}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Enhancement Panel */}
                {enhanceUsed !== null && enhanceLimit < 999999 && enhanceUsed >= enhanceLimit ? (
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-4 flex items-start gap-3">
                    <span className="text-2xl">✨</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">本月 AI 优化次数已用完</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        免费版每月可使用 {enhanceLimit} 次 AI 优化，下月自动重置。
                      </p>
                      <a href="/pricing" className="inline-block mt-2 text-xs text-primary hover:underline font-medium">
                        升级套餐，解锁更多次数 →
                      </a>
                    </div>
                  </div>
                ) : (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                  {/* Usage counter */}
                  {enhanceUsed !== null && enhanceLimit < 999999 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />AI 优化本月用量
                      </span>
                      <span className={cn(
                        "font-semibold tabular-nums",
                        enhanceUsed >= enhanceLimit ? "text-destructive" : enhanceUsed >= enhanceLimit * 0.8 ? "text-amber-600" : "text-foreground"
                      )}>
                        {enhanceUsed} / {enhanceLimit}
                      </span>
                    </div>
                  )}
                  {/* Writing style presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {WRITING_STYLES.map((s) => {
                      const active = aiInstruction === s.prompt;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          disabled={aiLoading || !!aiDraft}
                          onClick={() => setAiInstruction(active ? "" : s.prompt)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
                            (aiLoading || !!aiDraft) && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          <span>{s.emoji}</span>
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 items-stretch">
                    <Textarea
                      placeholder="描述优化要求（留空则自动润色语法和文笔）"
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !aiDraft) { e.preventDefault(); handleAiEnhance(); } }}
                      disabled={aiLoading || !!aiDraft}
                      rows={5}
                      className="bg-background border-border/60 text-sm min-h-[120px] resize-y flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={aiLoading ? () => { abortRef.current?.abort(); } : handleAiEnhance}
                      disabled={!!aiDraft && !aiLoading}
                      className="shrink-0 gap-1.5 self-stretch h-auto"
                      variant={aiLoading ? "outline" : "default"}
                    >
                      {aiLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />停止</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" />AI 优化</>
                      )}
                    </Button>
                  </div>

                  {aiError && <p className="text-xs text-destructive">{aiError}</p>}

                  {(aiLoading || aiDraft !== null) && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {aiLoading ? (
                          <span className="animate-pulse">正在生成优化版本...</span>
                        ) : (
                          "优化结果预览（可直接编辑）"
                        )}
                      </p>
                      <Textarea
                        value={aiDraft ?? ""}
                        onChange={(e) => setAiDraft(e.target.value)}
                        rows={10}
                        className="bg-background border-border/60 resize-none font-serif text-sm leading-relaxed"
                        readOnly={aiLoading}
                      />
                      {!aiLoading && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleDiscardDraft}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            丢弃
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleApplyDraft}
                            disabled={updateEntry.isPending}
                          >
                            {updateEntry.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            应用并保存
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

// ── 图文混排 for narrative entries ──────────────────────────────────────────────
interface NarrativeContentProps {
  content: string;
  photos: { id: number; url: string; caption: string | null }[];
  lightboxIndex: number | null;
  onPhotoClick: (idx: number) => void;
  onDeletePhoto: (id: number) => void;
  entryId: number;
}

// Parse [s:N]: section prefix from caption — returns { sectionIdx, displayCaption }
function parseSectionCaption(caption: string | null): { sectionIdx: number; displayCaption: string | null } {
  if (!caption) return { sectionIdx: -1, displayCaption: null };
  const m = caption.match(/^\[s:(\d+)\]:(.*)/s);
  if (m) {
    return { sectionIdx: Number(m[1]), displayCaption: m[2].trim() || null };
  }
  return { sectionIdx: -1, displayCaption: caption };
}

function NarrativeContent({ content, photos, onPhotoClick, onDeletePhoto, entryId }: NarrativeContentProps) {
  // Split on [===] section dividers (inserted by AI between source-entry sections)
  const rawSections = content.split(/\n?\[===\]\n?/).map((s) => s.trim()).filter(Boolean);
  const sections = rawSections.length > 1 ? rawSections : [content]; // fallback: single section

  // Group photos by their [s:N] section index; untagged photos go into last section
  const photosBySection = new Map<number, typeof photos>();
  const untagged: typeof photos = [];
  photos.forEach((p) => {
    const { sectionIdx } = parseSectionCaption(p.caption);
    if (sectionIdx >= 0) {
      const arr = photosBySection.get(sectionIdx) ?? [];
      arr.push(p);
      photosBySection.set(sectionIdx, arr);
    } else {
      untagged.push(p);
    }
  });
  // Distribute untagged photos evenly across sections
  untagged.forEach((p, i) => {
    const idx = i % sections.length;
    const arr = photosBySection.get(idx) ?? [];
    arr.push(p);
    photosBySection.set(idx, arr);
  });

  // Build the flat global photo list for lightbox index tracking
  const allPhotosOrdered = sections.flatMap((_, si) => photosBySection.get(si) ?? []);
  // Also include any photos that don't map to a valid section index
  const overflowPhotos = [...photosBySection.entries()]
    .filter(([k]) => k >= sections.length)
    .flatMap(([, ps]) => ps);

  const renderPhotoGrid = (sectionPhotos: typeof photos, baseIdx: number) => {
    if (sectionPhotos.length === 0) return null;
    return (
      <div className="py-3 space-y-2">
        {sectionPhotos.map((photo, i) => {
          const { displayCaption } = parseSectionCaption(photo.caption);
          const globalIdx = allPhotosOrdered.findIndex((p) => p.id === photo.id);
          return (
            <div key={photo.id} className="group relative rounded-2xl overflow-hidden shadow-md bg-muted/20">
              <img
                src={photo.url}
                alt={displayCaption ?? "旅途照片"}
                className="w-full object-cover max-h-[500px] cursor-pointer transition-transform duration-500 group-hover:scale-[1.01]"
                onClick={() => onPhotoClick(globalIdx >= 0 ? globalIdx : baseIdx + i)}
              />
              {displayCaption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                  <p className="text-white text-xs font-serif text-center">{displayCaption}</p>
                </div>
              )}
              <button
                onClick={() => onDeletePhoto(photo.id)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (text: string) => {
    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    return (
      <div className="py-4 space-y-4">
        {paragraphs.map((p, j) => (
          <p key={j} className="text-foreground/90 leading-[1.9] font-serif text-base whitespace-pre-wrap">{p}</p>
        ))}
      </div>
    );
  };

  let photoOffset = 0;
  return (
    <div>
      {sections.map((sectionText, si) => {
        const sectionPhotos = photosBySection.get(si) ?? [];
        const node = (
          <div key={si}>
            {renderSection(sectionText)}
            {renderPhotoGrid(sectionPhotos, photoOffset)}
          </div>
        );
        photoOffset += sectionPhotos.length;
        return node;
      })}
      {overflowPhotos.length > 0 && renderPhotoGrid(overflowPhotos, photoOffset)}
      <div className="pt-3">
        <PhotoUploader entryId={entryId} />
      </div>
    </div>
  );
}
