import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { MapPin, Heart, MessageCircle, Image as ImageIcon, CalendarDays, ChevronRight, Loader2, Users, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";

interface FeedEntry {
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
  viewerFavorited: boolean;
  tags: { id: number; name: string }[];
  author: { userId: string; name: string; avatar: string | null } | null;
  createdAt: string;
}

interface FollowingItem {
  userId: string;
  name: string;
  avatar: string | null;
}

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

export default function MyFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [favPending, setFavPending] = useState<number | null>(null);
  const LIMIT = 20;

  const fetchFeed = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const [feedRes, followingRes] = await Promise.all([
        fetch(`/api/me/feed?page=${p}&limit=${LIMIT}`, { credentials: "include" }),
        fetch(`/api/me/following`, { credentials: "include" }),
      ]);
      if (feedRes.ok) {
        const data = await feedRes.json();
        setEntries(data.entries);
        setTotal(data.total);
        setFollowingCount(data.followingCount);
      }
      if (followingRes.ok) {
        const list = await followingRes.json();
        setFollowing(list);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(page); }, [page, fetchFeed]);

  const handleToggleFavorite = async (entryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favPending) return;
    setFavPending(entryId);
    try {
      const res = await fetch(`/api/entries/${entryId}/favorite`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => prev.map((x) => x.id === entryId ? { ...x, viewerFavorited: data.favorited } : x));
      }
    } finally {
      setFavPending(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              关注动态
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {followingCount > 0 ? `关注了 ${followingCount} 位旅行者` : "还没有关注任何人"}
            </p>
          </div>
        </div>

        {/* Following strip */}
        {following.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {following.map((u) => (
              <div key={u.userId} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                <div className="w-12 h-12 rounded-full bg-primary/15 overflow-hidden flex items-center justify-center text-base font-semibold text-primary ring-2 ring-background shadow-sm">
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]}
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-full">{u.name}</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">{followingCount === 0 ? "👀" : "✍️"}</div>
            <p className="text-muted-foreground text-sm">
              {followingCount === 0 ? "去广场关注感兴趣的旅行者" : "关注的人还没有发布公开日记"}
            </p>
            {followingCount === 0 && (
              <Link href="/square" className="mt-2 text-primary text-sm hover:underline">去广场看看 →</Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map((entry) => {
                const travelDays = entry.endDate
                  ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1)
                  : 1;
                return (
                  <Link key={entry.id} href={`/public/${entry.id}`}>
                    <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col">
                      <div className="relative h-44 bg-muted/30 overflow-hidden shrink-0">
                        {entry.coverPhotoUrl ? (
                          <img src={entry.coverPhotoUrl} alt={entry.destination} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm">
                          <MapPin className="w-3 h-3 text-primary" />
                          {entry.destination}
                        </div>
                        <button
                          onClick={(e) => handleToggleFavorite(entry.id, e)}
                          disabled={favPending === entry.id}
                          title={entry.viewerFavorited ? "取消收藏" : "收藏"}
                          className={cn(
                            "absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-sm transition-colors shadow-sm",
                            entry.viewerFavorited ? "bg-amber-100/90 text-amber-600" : "bg-background/90 text-muted-foreground hover:text-amber-500",
                          )}
                        >
                          {favPending === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className={cn("w-3.5 h-3.5", entry.viewerFavorited && "fill-amber-500")} />}
                        </button>
                        {entry.mood && (
                          <div className={cn("absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-medium", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
                            {entry.mood}
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 flex flex-col gap-2 flex-1">
                        <h3 className="font-serif font-semibold text-foreground text-sm leading-snug line-clamp-2">{entry.title}</h3>

                        {entry.author && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="w-4 h-4 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-semibold text-primary">
                              {entry.author.avatar ? <img src={entry.author.avatar} alt="" className="w-full h-full object-cover" /> : entry.author.name[0]}
                            </div>
                            <span className="truncate">{entry.author.name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3 shrink-0" />
                          <span>
                            {format(new Date(entry.startDate), "yyyy.MM.dd")}
                            {entry.endDate && ` · ${travelDays}天`}
                          </span>
                        </div>

                        {entry.content && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.content}</p>
                        )}

                        <div className="mt-auto pt-2 border-t border-border/30 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-3.5 h-3.5" />
                            <span>{entry.likeCount}</span>
                          </div>
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-1.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">上一页</button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-1.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">下一页</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
