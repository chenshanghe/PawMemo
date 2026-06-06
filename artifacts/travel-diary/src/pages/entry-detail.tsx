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

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  const [photoColumns, setPhotoColumnsState] = useState<1 | 2 | 3>(1);
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`narrativePhotoLayout:${id}`);
    if (stored === "2" || stored === "3") setPhotoColumnsState(stored === "2" ? 2 : 3);
  }, [id]);

  const setPhotoColumns = (col: 1 | 2 | 3) => {
    setPhotoColumnsState(col);
    localStorage.setItem(`narrativePhotoLayout:${id}`, String(col));
  };

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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // AI enhance usage quota
  const [enhanceUsed, setEnhanceUsed] = useState<number | null>(null);
  const [enhanceLimit, setEnhanceLimit] = useState<number>(5);

  useEffect(() => {
    fetch(`${BASE}/api/me/subscription`, { credentials: "include" })
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
      const resp = await fetch(`${BASE}/api/ai/enhance`, {
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
          setAiPanelOpen(false);
        },
      }
    );
  };

  const handleDiscardDraft = () => {
    abortRef.current?.abort();
    setAiDraft(null);
    setAiError(null);
    setAiPanelOpen(false);
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
            {/* Photo column picker — only for narratives with photos */}
            {(entry as any).entryType === "narrative" && photos.length > 0 && (
              <div className="flex items-center rounded-xl border border-border/60 overflow-hidden" title="切换图片排版列数">
                {([1, 2, 3] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setPhotoColumns(col)}
                    title={`${col} 列`}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      col > 1 && "border-l border-border/60",
                      photoColumns === col ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {col === 1 && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="1" y="1" width="12" height="12" rx="1.5"/>
                      </svg>
                    )}
                    {col === 2 && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="1" y="1" width="5" height="12" rx="1.5"/>
                        <rect x="8" y="1" width="5" height="12" rx="1.5"/>
                      </svg>
                    )}
                    {col === 3 && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="1" y="1" width="3.3" height="12" rx="1"/>
                        <rect x="5.35" y="1" width="3.3" height="12" rx="1"/>
                        <rect x="9.7" y="1" width="3.3" height="12" rx="1"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(`/entries/${id}/print`, "_blank")}
            >
              导出 PDF
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
            <img src={entry.coverImage} alt={entry.title} decoding="async" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-6 pb-6 border-b border-border/30">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight tracking-tight">{entry.title}</h1>
          <div className="flex flex-wrap items-center gap-y-3 gap-x-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{entry.destination}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
              <CalendarDays className="w-4 h-4" />
              <span className="font-medium">{format(new Date(entry.startDate), 'yyyy年MM月dd日')}</span>
              {entry.endDate && <span className="font-medium"> — {format(new Date(entry.endDate), 'MM月dd日')}</span>}
              <span className="text-primary ml-1 font-bold">{travelDays} 天</span>
            </div>
            {entry.rating && (
              <div className="flex items-center gap-0.5 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < entry.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            {entry.mood && (
              <span className={`px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold tracking-wider ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>
                {entry.mood}
              </span>
            )}
            {entry.companions && (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
                <Users className="w-4 h-4 shrink-0 text-primary/70" />
                <span className="font-medium">{entry.companions}</span>
              </div>
            )}
            {(entry as any).weather && (() => {
              const w = (entry as any).weather as { icon: string; desc: string; tempMax: number; tempMin: number };
              return (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50/50 border border-sky-200/50 shadow-sm text-sky-700 text-xs font-bold">
                  <span className="text-sm">{w.icon}</span> {w.desc} {w.tempMax}°/{w.tempMin}°C
                </span>
              );
            })()}
            {(() => {
              const v: "private" | "public" | "shared" = (entry as any).visibility ?? "private";
              const isOwner = !!user && entry.userId === user.id;
              const opts = [
                { value: "private" as const, Icon: Lock,  label: "私密",     cls: "text-muted-foreground bg-muted/40 border-border/50", optCls: "hover:bg-muted/60" },
                { value: "shared"  as const, Icon: Link2, label: "分享可见",  cls: "text-blue-700 bg-blue-50 border-blue-200/60",            optCls: "hover:bg-blue-50" },
                { value: "public"  as const, Icon: Globe, label: "公开",      cls: "text-green-700 bg-green-50 border-green-200/60",          optCls: "hover:bg-green-50" },
              ];
              const cur = opts.find((o) => o.value === v) ?? opts[0];

              if (!isOwner) {
                return (
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${cur.cls}`}>
                    <cur.Icon className="w-3.5 h-3.5" />
                    {cur.label}
                  </span>
                );
              }

              return (
                <div ref={visibilityRef} className="relative">
                  <button
                    onClick={() => setVisibilityOpen((o) => !o)}
                    disabled={visibilityUpdating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border transition-all ${cur.cls} ${visibilityUpdating ? "opacity-50" : "hover:opacity-80 hover:shadow-md"}`}
                  >
                    {visibilityUpdating
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <cur.Icon className="w-3.5 h-3.5" />}
                    {cur.label}
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-60" />
                  </button>
                  {visibilityOpen && (
                    <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border/60 rounded-xl shadow-xl py-1.5 min-w-[10rem] animate-in fade-in zoom-in-95 duration-200">
                      {opts.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleUpdateVisibility(opt.value)}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${opt.optCls} ${opt.value === v ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <opt.Icon className="w-4 h-4 shrink-0" />
                          {opt.label}
                          {opt.value === v && <Check className="w-4 h-4 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {entry.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 transition-colors px-3 py-1 rounded-md text-xs font-semibold">
                  # {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Video embed */}
        {(() => {
          const videoUrl: string | null = (entry as any).videoUrl ?? null;
          if (!videoUrl) return null;
          const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const bvMatch = videoUrl.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i);
          const embedUrl = ytMatch
            ? `https://www.youtube.com/embed/${ytMatch[1]}`
            : bvMatch
            ? `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1&high_quality=1`
            : null;
          if (!embedUrl) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-xl font-serif font-bold text-foreground">旅途视频</h2>
              <div className="rounded-2xl overflow-hidden aspect-video shadow-sm border border-border/40 bg-muted/20">
                <iframe
                  src={embedUrl}
                  title="旅途视频"
                  allowFullScreen
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          );
        })()}

        {/* Social: likes, comments, share */}
        <SocialPanel
          entryId={id}
          isOwner={!!user && entry.userId === user.id}
          visibility={(entry as any).visibility ?? "private"}
        />

        {/* Content — narrative entries get 图文混排, regular entries get photo grid + plain text */}
        {(entry as any).entryType === "narrative" && entry.content ? (
          <>
            <NarrativeContent
              content={entry.content}
              photos={photos}
              columns={photoColumns}
              lightboxIndex={lightboxIndex}
              onPhotoClick={setLightboxIndex}
              onDeletePhoto={handleDeletePhoto}
              entryId={id}
            />
          </>
        ) : (
          <>
            {/* Photos grid for regular entries */}
            <div className="space-y-4 pt-6">
              <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">旅途照片</h2>
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {photos.map((photo, idx) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl shadow-sm border border-border/40 bg-muted/20">
                      <img
                        src={photo.url}
                        alt={photo.caption ?? "旅途照片"}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300">
                          <p className="text-white/90 text-sm font-medium line-clamp-2">{photo.caption}</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-300 hover:bg-destructive hover:text-white backdrop-blur-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2">
                <PhotoUploader entryId={id} />
              </div>
            </div>

            {entry.content && (
              <div className="space-y-6 pt-6 border-t border-border/30">
                <div className="prose prose-base md:prose-lg max-w-none text-foreground/90 leading-[1.8] whitespace-pre-wrap font-serif selection:bg-primary/20">
                  {entry.content}
                </div>

                {/* AI Enhancement toggle button */}
                <button
                  onClick={() => setAiPanelOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    aiPanelOpen
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 优化
                </button>

                {/* AI Enhancement Panel */}
                {aiPanelOpen && (enhanceUsed !== null && enhanceLimit < 999999 && enhanceUsed >= enhanceLimit ? (
                  <div className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-5 flex items-start gap-4 shadow-sm">
                    <span className="text-3xl drop-shadow-sm">✨</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-amber-900">本月 AI 优化次数已用完</p>
                      <p className="text-sm text-amber-700/80 mt-1 leading-relaxed">
                        免费版每月可使用 {enhanceLimit} 次 AI 优化，下月自动重置。
                      </p>
                      <a href="/pricing" className="inline-block mt-3 px-4 py-2 bg-amber-100 text-amber-900 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors shadow-sm">
                        升级套餐，解锁更多次数 →
                      </a>
                    </div>
                  </div>
                ) : (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  
                  {/* Usage counter */}
                  {enhanceUsed !== null && enhanceLimit < 999999 && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-primary/70" />AI 优化本月用量
                      </span>
                      <span className={cn(
                        "font-bold tabular-nums px-2 py-0.5 rounded-full bg-background border shadow-sm",
                        enhanceUsed >= enhanceLimit ? "text-destructive border-destructive/20" : enhanceUsed >= enhanceLimit * 0.8 ? "text-amber-600 border-amber-200" : "text-primary border-primary/20"
                      )}>
                        {enhanceUsed} / {enhanceLimit}
                      </span>
                    </div>
                  )}
                  {/* Writing style presets */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground ml-1">选择写作风格</p>
                    <div className="flex flex-wrap gap-2">
                      {WRITING_STYLES.map((s) => {
                        const active = aiInstruction === s.prompt;
                        return (
                          <button
                            key={s.name}
                            type="button"
                            disabled={aiLoading || !!aiDraft}
                            onClick={() => setAiInstruction(active ? "" : s.prompt)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm",
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                                : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
                              (aiLoading || !!aiDraft) && "opacity-50 cursor-not-allowed transform-none",
                            )}
                          >
                            <span className="text-sm">{s.emoji}</span>
                            <span>{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch pt-2">
                    <Textarea
                      placeholder="描述优化要求（留空则自动润色语法和文笔）..."
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !aiDraft) { e.preventDefault(); handleAiEnhance(); } }}
                      disabled={aiLoading || !!aiDraft}
                      rows={4}
                      className="bg-background/80 backdrop-blur-sm border-border/60 text-sm resize-y flex-1 rounded-xl shadow-inner focus-visible:ring-primary/30"
                    />
                    <Button
                      type="button"
                      size="default"
                      onClick={aiLoading ? () => { abortRef.current?.abort(); } : handleAiEnhance}
                      disabled={!!aiDraft && !aiLoading}
                      className={cn("shrink-0 gap-2 self-stretch sm:w-28 rounded-xl font-bold shadow-sm transition-all", aiLoading ? "bg-muted text-muted-foreground" : "")}
                      variant={aiLoading ? "outline" : "default"}
                    >
                      {aiLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />停止</>
                      ) : (
                        <><Sparkles className="w-4 h-4" />开始优化</>
                      )}
                    </Button>
                  </div>

                  {aiError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium">{aiError}</div>}

                  {(aiLoading || aiDraft !== null) && (
                    <div className="space-y-3 pt-4 border-t border-border/40 mt-4">
                      <p className="text-sm text-primary font-bold flex items-center gap-2">
                        {aiLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> 正在生成优化版本...</>
                        ) : (
                          <><Check className="w-4 h-4" /> 优化结果预览（可直接编辑）</>
                        )}
                      </p>
                      <Textarea
                        value={aiDraft ?? ""}
                        onChange={(e) => setAiDraft(e.target.value)}
                        rows={12}
                        className="bg-background/90 backdrop-blur border-primary/30 shadow-inner resize-none font-serif text-base leading-[1.8] rounded-xl focus-visible:ring-primary/30"
                        readOnly={aiLoading}
                      />
                      {!aiLoading && (
                        <div className="flex gap-3 justify-end pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-xl font-bold border-border/60 hover:bg-muted/60"
                            onClick={handleDiscardDraft}
                          >
                            <RotateCcw className="w-4 h-4" />
                            丢弃
                          </Button>
                          <Button
                            type="button"
                            className="gap-2 rounded-xl font-bold shadow-sm"
                            onClick={handleApplyDraft}
                            disabled={updateEntry.isPending}
                          >
                            {updateEntry.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            应用并保存
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                ))}
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
  photos: { id: number; url: string; caption?: string | null }[];
  columns: 1 | 2 | 3;
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

function NarrativeContent({ content, photos, columns, onPhotoClick, onDeletePhoto, entryId }: NarrativeContentProps) {
  // Split on [===] section dividers (inserted by AI between source-entry sections)
  const rawSections = content.split(/\n?\[===\]\n?/).map((s) => s.trim()).filter(Boolean);
  const sections = rawSections.length > 1 ? rawSections : [content]; // fallback: single section

  // Group photos by their [s:N] section index; untagged photos go into last section
  const photosBySection = new Map<number, typeof photos>();
  const untagged: typeof photos = [];
  photos.forEach((p) => {
    const { sectionIdx } = parseSectionCaption(p.caption ?? null);
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

    if (columns === 1) {
      return (
        <div className="py-3 space-y-2">
          {sectionPhotos.map((photo, i) => {
            const { displayCaption } = parseSectionCaption(photo.caption ?? null);
            const globalIdx = allPhotosOrdered.findIndex((p) => p.id === photo.id);
            return (
              <div key={photo.id} className="group relative rounded-2xl overflow-hidden shadow-md bg-muted/20">
                <img
                  src={photo.url}
                  alt={displayCaption ?? "旅途照片"}
                  loading="lazy"
                  decoding="async"
                  className="w-full object-cover max-h-[60vw] cursor-pointer transition-transform duration-500 group-hover:scale-[1.01]"
                  onClick={() => onPhotoClick(globalIdx >= 0 ? globalIdx : baseIdx + i)}
                />
                {displayCaption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <p className="text-white text-xs font-serif text-center">{displayCaption}</p>
                  </div>
                )}
                <button
                  onClick={() => onDeletePhoto(photo.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    const gridCls = columns === 2 ? "grid grid-cols-2 gap-1.5" : "grid grid-cols-3 gap-1";
    return (
      <div className={cn("py-3", gridCls)}>
        {sectionPhotos.map((photo, i) => {
          const { displayCaption } = parseSectionCaption(photo.caption ?? null);
          const globalIdx = allPhotosOrdered.findIndex((p) => p.id === photo.id);
          return (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl shadow-sm bg-muted/20">
              <img
                src={photo.url}
                alt={displayCaption ?? "旅途照片"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                onClick={() => onPhotoClick(globalIdx >= 0 ? globalIdx : baseIdx + i)}
              />
              {displayCaption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                  <p className="text-white text-[10px] font-serif text-center line-clamp-2">{displayCaption}</p>
                </div>
              )}
              <button
                onClick={() => onDeletePhoto(photo.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-2.5 h-2.5" />
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
