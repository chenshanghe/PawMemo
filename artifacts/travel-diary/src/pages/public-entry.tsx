import React, { useEffect, useState, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { MapPin, CalendarDays, Star, Heart, MessageCircle, ChevronLeft, ChevronRight, X, Users, Loader2, Trash2, Globe, Bookmark, UserPlus, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PublicEntryView, EntryComment } from "@workspace/api-client-react";

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
  const prev = () => setCurrent((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrent((i) => (i + 1) % photos.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const photo = photos[current];
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      {photos.length > 1 && (
        <>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10 bg-black/30 rounded-full" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10 bg-black/30 rounded-full" onClick={(e) => { e.stopPropagation(); next(); }}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
        <img src={photo.url} alt={photo.caption ?? ""} className="max-h-[80vh] max-w-full object-contain rounded-lg" />
        {photo.caption && <p className="text-white/70 text-sm text-center">{photo.caption}</p>}
        {photos.length > 1 && <p className="text-white/50 text-xs">{current + 1} / {photos.length}</p>}
      </div>
    </div>
  );
}

export default function PublicEntry({ params }: { params: { id: string } }) {
  const entryId = Number(params.id);
  const { user, isSignedIn } = useUser();
  const [data, setData] = useState<PublicEntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notPublic, setNotPublic] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [likes, setLikes] = useState({ count: 0, viewerLiked: false });
  const [likePending, setLikePending] = useState(false);
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  // Author / follow / favorite
  const [author, setAuthor] = useState<{ userId: string; name: string; avatar: string | null } | null>(null);
  const [viewerFollowing, setViewerFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [viewerFavorited, setViewerFavorited] = useState(false);
  const [favPending, setFavPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/entries/${entryId}/public`, { credentials: "include" });
        if (res.status === 403) { setNotPublic(true); setLoading(false); return; }
        if (!res.ok) { setNotFound(true); return; }
        const d: any = await res.json();
        setData(d);
        setLikes({ count: d.likeCount, viewerLiked: d.viewerLiked });
        setComments(d.comments);
        setAuthor(d.author ?? null);
        setViewerFollowing(!!d.viewerFollowing);
        setViewerFavorited(!!d.viewerFavorited);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [entryId]);

  const handleToggleFollow = async () => {
    if (!isSignedIn || followPending || !author) return;
    setFollowPending(true);
    try {
      const res = await fetch(`${BASE}/api/users/${author.userId}/follow`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setViewerFollowing(data.following);
      }
    } finally {
      setFollowPending(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isSignedIn || favPending || !data) return;
    setFavPending(true);
    try {
      const res = await fetch(`${BASE}/api/entries/${data.entry.id}/favorite`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const r = await res.json();
        setViewerFavorited(r.favorited);
      }
    } finally {
      setFavPending(false);
    }
  };

  const handleToggleLike = async () => {
    if (!isSignedIn || likePending || !data) return;
    setLikePending(true);
    try {
      const res = await fetch(`${BASE}/api/entries/${data.entry.id}/likes`, { method: "POST", credentials: "include" });
      if (res.ok) setLikes(await res.json());
    } finally {
      setLikePending(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentPending || !isSignedIn || !data) return;
    setCommentPending(true);
    try {
      const res = await fetch(`${BASE}/api/entries/${data.entry.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          userName: user?.fullName || user?.username || "匿名用户",
          userAvatar: user?.imageUrl ?? null,
        }),
      });
      if (res.ok) {
        const c: EntryComment = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentText("");
      }
    } finally {
      setCommentPending(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const res = await fetch(`${BASE}/api/comments/${commentId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notPublic) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">🔒</div>
        <h2 className="text-xl font-serif font-bold">此随记不是公开状态</h2>
        <p className="text-muted-foreground text-sm">作者尚未将此随记设为公开。</p>
        <a href="/square" className="text-primary text-sm hover:underline">← 返回广场</a>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">🗺️</div>
        <h2 className="text-xl font-serif font-bold">随记不存在</h2>
        <p className="text-muted-foreground text-sm">此页面不存在或已被删除。</p>
        <a href="/square" className="text-primary text-sm hover:underline">← 返回广场</a>
      </div>
    );
  }

  const { entry } = data;
  const photos = entry.photos ?? [];
  const travelDays = entry.endDate
    ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox photos={photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div className="min-h-[100dvh] bg-background">
        {/* Back bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
          <a href="/square" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            广场
          </a>
          <div className="flex items-center gap-1 ml-auto text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <Globe className="w-3 h-3" />
            公开
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Cover photos */}
          {photos.length > 0 && (
            <div className={cn("grid gap-2 rounded-2xl overflow-hidden",
              photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {photos.slice(0, photos.length === 3 ? 3 : photos.length === 1 ? 1 : 4).map((photo, i) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(i)}
                  className={cn(
                    "relative cursor-pointer overflow-hidden bg-muted/30",
                    photos.length === 1 ? "aspect-video" : "aspect-square",
                    photos.length === 3 && i === 0 ? "col-span-2 aspect-video" : "",
                    photos.length > 4 && i === 3 ? "relative" : ""
                  )}
                >
                  <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  {photos.length > 4 && i === 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                      +{photos.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Author */}
          {author && (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card/40">
              <Link href={`/users/${author.userId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                  {author.avatar ? <img src={author.avatar} alt="" className="w-full h-full object-cover" /> : author.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{author.name}</p>
                  <p className="text-xs text-muted-foreground">旅行者</p>
                </div>
              </Link>
              {isSignedIn && user?.id !== author.userId && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followPending}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                    viewerFollowing
                      ? "bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                  )}
                >
                  {followPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : viewerFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {viewerFollowing ? "已关注" : "关注"}
                </button>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="space-y-3">
            <h1 className="text-2xl font-serif font-bold text-foreground leading-snug">{entry.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">{entry.destination}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>{format(new Date(entry.startDate), "yyyy年MM月dd日")}</span>
                {entry.endDate && <span>— {format(new Date(entry.endDate), "MM月dd日")} · {travelDays}天</span>}
              </div>
              {(entry.rating ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: entry.rating! }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              {entry.mood && (
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
                  {entry.mood}
                </span>
              )}
              {entry.companions && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{entry.companions}</span>
                </div>
              )}
            </div>

            {(entry.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(entry.tags ?? []).map((tag: { id: number; name: string }) => (
                  <Badge key={tag.id} variant="outline" className="border-border/50 text-muted-foreground">
                    #{tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          {entry.content && (
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif">
              {entry.content}
            </div>
          )}

          {/* Social */}
          <div className="border-t border-border/40 pt-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleToggleLike}
                disabled={!isSignedIn || likePending}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  likes.viewerLiked
                    ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                    : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground",
                  !isSignedIn && "cursor-default opacity-60"
                )}
              >
                <Heart className={cn("w-4 h-4", likes.viewerLiked && "fill-red-500")} />
                <span>{likes.count > 0 ? likes.count : ""} 点赞</span>
              </button>

              <button
                onClick={() => setShowComments((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  showComments
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{comments.length > 0 ? comments.length : ""} 评论</span>
              </button>

              <button
                onClick={handleToggleFavorite}
                disabled={!isSignedIn || favPending}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  viewerFavorited
                    ? "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                    : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground",
                  !isSignedIn && "cursor-default opacity-60",
                )}
              >
                {favPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className={cn("w-4 h-4", viewerFavorited && "fill-amber-500")} />}
                <span>{viewerFavorited ? "已收藏" : "收藏"}</span>
              </button>

              {!isSignedIn && (
                <span className="text-xs text-muted-foreground ml-1">登录后可点赞、评论、收藏</span>
              )}
            </div>

            {showComments && (
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">还没有评论，来说点什么吧</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold text-primary">
                          {c.userAvatar ? <img src={c.userAvatar} alt="" className="w-full h-full object-cover" /> : c.userName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{c.userName}</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {format(new Date(c.createdAt), "MM-dd HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                        {isSignedIn && user?.id === c.userId && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isSignedIn ? (
                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="说点什么..."
                      rows={2}
                      className="flex-1 resize-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitComment();
                      }}
                    />
                    <Button size="sm" onClick={handleSubmitComment} disabled={commentPending || !commentText.trim()} className="shrink-0">
                      {commentPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "发送"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <a href="/sign-in" className="text-primary hover:underline">登录</a>后参与评论
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
