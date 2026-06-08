import React, { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { MapPin, Heart, MessageCircle, CalendarDays, Loader2, RefreshCw, Bookmark, Tag, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@clerk/react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LIMIT = 20;

interface SquareEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  mood: string | null;
  content: string | null;
  likeCount: number;
  commentCount: number;
  coverPhotoUrl: string | null;
  viewerLiked: boolean;
  viewerFavorited?: boolean;
  tags: { id: number; name: string }[];
  author?: { userId: string; name: string; avatar: string | null } | null;
  createdAt: string;
}

interface PopularTag {
  id: number;
  name: string;
  count: number;
}

const MOOD_STYLES: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

const PLACEHOLDER_GRADIENTS = [
  "from-orange-100 to-amber-50",
  "from-sky-100 to-blue-50",
  "from-emerald-100 to-teal-50",
  "from-violet-100 to-purple-50",
  "from-pink-100 to-rose-50",
];

export default function Square() {
  const { isSignedIn } = useUser();

  const [entries, setEntries] = useState<SquareEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);

  const [likedMap, setLikedMap] = useState<Record<number, { count: number; liked: boolean }>>({});
  const [favMap, setFavMap] = useState<Record<number, boolean>>({});
  const [likePending, setLikePending] = useState<number | null>(null);
  const [favPending, setFavPending] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/tags/popular`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setPopularTags)
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(async (p: number, tag: string | null) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";
      const res = await fetch(`${BASE}/api/square?page=${p}&limit=${LIMIT}${tagParam}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setEntries((prev) => p === 1 ? data.entries : [...prev, ...data.entries]);
      setTotal(data.total);
      setHasMore(data.entries.length >= LIMIT && p * LIMIT < data.total);
      const newLiked: Record<number, { count: number; liked: boolean }> = {};
      const newFav: Record<number, boolean> = {};
      for (const e of data.entries) {
        newLiked[e.id] = { count: e.likeCount, liked: e.viewerLiked };
        if (e.viewerFavorited) newFav[e.id] = true;
      }
      setLikedMap((prev) => ({ ...prev, ...newLiked }));
      setFavMap((prev) => ({ ...prev, ...newFav }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page, activeTag);
  }, [page, activeTag, fetchPage]);

  const handleTagSelect = useCallback((tag: string | null) => {
    setActiveTag(tag);
    setEntries([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setPage((p) => p + 1);
  }, [hasMore, loadingMore, loading]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore, loadingMore || loading);

  const handleLike = async (entryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn || likePending) return;
    setLikePending(entryId);
    try {
      const res = await fetch(`${BASE}/api/entries/${entryId}/likes`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLikedMap((prev) => ({ ...prev, [entryId]: { count: data.count, liked: data.viewerLiked } }));
      }
    } finally {
      setLikePending(null);
    }
  };

  const handleFavorite = async (entryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn || favPending) return;
    setFavPending(entryId);
    try {
      const res = await fetch(`${BASE}/api/entries/${entryId}/favorite`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFavMap((prev) => ({ ...prev, [entryId]: data.favorited }));
      }
    } finally {
      setFavPending(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in duration-300">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-black text-foreground tracking-tight">旅行广场</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTag
                ? `#${activeTag} · ${total} 篇旅记`
                : total > 0 ? `发现 ${total} 篇精彩旅程` : "发现旅行者的精彩瞬间"}
            </p>
          </div>
          <button
            onClick={() => { setEntries([]); setPage(1); setHasMore(true); fetchPage(1, activeTag); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors text-xs font-medium shadow-sm"
            title="刷新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </div>

        {/* ── Tag filter pills ── */}
        {popularTags.length > 0 && (
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <button
                onClick={() => handleTagSelect(null)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                  activeTag === null
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card",
                )}
              >
                全部
              </button>
              {popularTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag.name)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                    activeTag === tag.name
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card",
                  )}
                >
                  <span className="opacity-70">#</span>{tag.name}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-card/30 border border-border/40 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {activeTag ? <Tag className="w-7 h-7 text-primary/50" /> : <span className="text-3xl">🌍</span>}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {activeTag ? `没有 #${activeTag} 的旅行日记` : "暂无公开的旅行日记"}
              </p>
              {activeTag && (
                <button onClick={() => handleTagSelect(null)} className="text-primary text-sm font-bold hover:underline">
                  查看全部 →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entries.map((entry) => {
              const liked = likedMap[entry.id];
              const travelDays = entry.endDate
                ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1)
                : 1;
              const gradientClass = PLACEHOLDER_GRADIENTS[entry.id % PLACEHOLDER_GRADIENTS.length];
              const isFav = favMap[entry.id];

              return (
                <Link key={entry.id} href={`/public/${entry.id}`}>
                  <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

                    {/* ── Cover image ── */}
                    <div className="relative h-52 overflow-hidden shrink-0">
                      {entry.coverPhotoUrl ? (
                        <img
                          src={entry.coverPhotoUrl}
                          alt={entry.destination}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradientClass)}>
                          <span className="text-7xl font-serif font-bold text-foreground/8 select-none">
                            {entry.destination.slice(0, 1)}
                          </span>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                      {/* Mood badge — top right (before bookmark) */}
                      {entry.mood && (
                        <div className={cn(
                          "absolute top-2.5 right-10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shadow-sm",
                          MOOD_STYLES[entry.mood] ?? "bg-muted text-muted-foreground",
                        )}>
                          {entry.mood}
                        </div>
                      )}

                      {/* Bookmark — top right corner */}
                      {isSignedIn && (
                        <button
                          onClick={(e) => handleFavorite(entry.id, e)}
                          disabled={favPending === entry.id}
                          title={isFav ? "取消收藏" : "收藏"}
                          className={cn(
                            "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-sm",
                            isFav ? "bg-amber-100/90 text-amber-600" : "bg-black/28 text-white/80 hover:bg-amber-100/90 hover:text-amber-600",
                          )}
                        >
                          {favPending === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Bookmark className={cn("w-3.5 h-3.5", isFav && "fill-amber-500")} />}
                        </button>
                      )}

                      {/* Location pill — bottom left */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 text-white/85" />
                        <span className="text-xs font-semibold text-white">{entry.destination}</span>
                      </div>
                    </div>

                    {/* ── Card body ── */}
                    <div className="p-3.5 flex flex-col gap-2.5 flex-1">

                      {/* Title */}
                      <h3 className="font-serif font-bold text-foreground text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {entry.title}
                      </h3>

                      {/* Date + days */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span>
                          {format(new Date(entry.startDate), "yyyy.MM.dd")}
                          {entry.endDate && ` · ${travelDays} 天`}
                        </span>
                      </div>

                      {/* Content snippet — italic quote with left border */}
                      {entry.content && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed italic border-l-2 border-border/60 pl-2">
                          "{entry.content}"
                        </p>
                      )}

                      {/* Tags */}
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <button
                              key={tag.id}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTagSelect(tag.name); }}
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors",
                                activeTag === tag.name
                                  ? "bg-primary/18 text-primary"
                                  : "bg-primary/8 text-primary/80 hover:bg-primary/15 hover:text-primary",
                              )}
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ── Footer ── */}
                      <div className="mt-auto pt-2.5 border-t border-border/30 flex items-center gap-2">
                        {/* Author */}
                        {entry.author ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {entry.author.avatar ? (
                              <img
                                src={entry.author.avatar}
                                alt={entry.author.name}
                                className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-border/50"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-primary">{entry.author.name.slice(0, 1)}</span>
                              </div>
                            )}
                            <span className="text-[11px] text-muted-foreground truncate">{entry.author.name}</span>
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}

                        {/* Likes */}
                        <button
                          onClick={(e) => handleLike(entry.id, e)}
                          disabled={!isSignedIn || likePending === entry.id}
                          className={cn(
                            "flex items-center gap-1 text-[11px] transition-colors",
                            liked?.liked ? "text-red-500" : "text-muted-foreground hover:text-red-400",
                            !isSignedIn && "cursor-default",
                          )}
                        >
                          <Heart className={cn("w-3.5 h-3.5 transition-transform", liked?.liked && "fill-red-500 scale-110")} />
                          <span>{liked?.count ?? entry.likeCount}</span>
                        </button>

                        {/* Comments */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{entry.commentCount}</span>
                        </div>

                        {/* Read link */}
                        <span className="flex items-center gap-0.5 text-[11px] text-primary font-bold shrink-0">
                          阅读
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading more */}
        {loadingMore && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        )}

        {/* End of list */}
        {!hasMore && entries.length > 0 && !loading && (
          <p className="text-center text-xs text-muted-foreground/40 py-4">— 已加载全部 {entries.length} 篇 —</p>
        )}
      </div>
    </Layout>
  );
}
