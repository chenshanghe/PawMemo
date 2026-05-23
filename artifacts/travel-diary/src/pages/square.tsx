import React, { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { MapPin, Heart, MessageCircle, Image as ImageIcon, CalendarDays, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@clerk/react";
import { cn } from "@/lib/utils";

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
  tags: { id: number; name: string }[];
  createdAt: string;
}

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

export default function Square() {
  const { isSignedIn } = useUser();
  const [entries, setEntries] = useState<SquareEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<number, { count: number; liked: boolean }>>({});
  const [likePending, setLikePending] = useState<number | null>(null);
  const LIMIT = 20;

  const fetchSquare = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/square?page=${p}&limit=${LIMIT}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      const map: Record<number, { count: number; liked: boolean }> = {};
      for (const e of data.entries) {
        map[e.id] = { count: e.likeCount, liked: e.viewerLiked };
      }
      setLikedMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSquare(page); }, [page, fetchSquare]);

  const handleLike = async (entryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn || likePending) return;
    setLikePending(entryId);
    try {
      const res = await fetch(`/api/entries/${entryId}/likes`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLikedMap((prev) => ({ ...prev, [entryId]: { count: data.count, liked: data.viewerLiked } }));
      }
    } finally {
      setLikePending(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">旅行广场</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `共 ${total} 篇公开日记` : "还没有公开的日记"}
          </p>
        </div>
        <button
          onClick={() => fetchSquare(page)}
          className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">🌍</div>
          <p className="text-muted-foreground text-sm">暂无公开的旅行日记</p>
          <p className="text-xs text-muted-foreground/70">将你的日记设置为「公开」，让它出现在这里</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => {
              const liked = likedMap[entry.id];
              const travelDays = entry.endDate
                ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1)
                : 1;

              return (
                <Link key={entry.id} href={`/public/${entry.id}`}>
                  <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 flex flex-col">
                    {/* Cover */}
                    <div className="relative h-44 bg-muted/30 overflow-hidden shrink-0">
                      {entry.coverPhotoUrl ? (
                        <img
                          src={entry.coverPhotoUrl}
                          alt={entry.destination}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                      {/* Destination badge */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm">
                        <MapPin className="w-3 h-3 text-primary" />
                        {entry.destination}
                      </div>

                      {/* Mood */}
                      {entry.mood && (
                        <div className={cn("absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs font-medium", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
                          {entry.mood}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3.5 flex flex-col gap-2 flex-1">
                      <h3 className="font-serif font-semibold text-foreground text-sm leading-snug line-clamp-2">
                        {entry.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span>
                          {format(new Date(entry.startDate), "yyyy.MM.dd")}
                          {entry.endDate && ` · ${travelDays}天`}
                        </span>
                      </div>

                      {entry.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {entry.content}
                        </p>
                      )}

                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span key={tag.id} className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: likes & comments */}
                      <div className="mt-auto pt-2 border-t border-border/30 flex items-center justify-between">
                        <button
                          onClick={(e) => handleLike(entry.id, e)}
                          disabled={!isSignedIn || likePending === entry.id}
                          className={cn(
                            "flex items-center gap-1 text-xs transition-colors",
                            liked?.liked ? "text-red-500" : "text-muted-foreground hover:text-red-400",
                            !isSignedIn && "cursor-default"
                          )}
                        >
                          <Heart className={cn("w-3.5 h-3.5", liked?.liked && "fill-red-500")} />
                          <span>{liked?.count ?? entry.likeCount}</span>
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{entry.commentCount}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-xs text-primary/70 group-hover:text-primary transition-colors">
                          <span>阅读</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-1.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-1.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
