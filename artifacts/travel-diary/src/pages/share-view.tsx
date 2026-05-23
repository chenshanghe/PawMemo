import React, { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import { MapPin, CalendarDays, Star, Heart, MessageCircle, ChevronLeft, ChevronRight, X, Users, Loader2, Trash2 } from "lucide-react";
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
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{current + 1} / {photos.length}</span>
      {photos.length > 1 && (
        <>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10" onClick={(e) => { e.stopPropagation(); next(); }}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img src={photo.url} alt={photo.caption ?? ""} className="max-w-full max-h-[85vh] object-contain rounded-lg select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
      {photo.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">{photo.caption}</p>
      )}
    </div>
  );
}

export default function ShareView({ params }: { params: { token: string } }) {
  const { token } = params;
  const { user, isSignedIn } = useUser();
  const [data, setData] = useState<PublicEntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [likes, setLikes] = useState({ count: 0, viewerLiked: false });
  const [likePending, setLikePending] = useState(false);
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPending, setCommentPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`, { credentials: "include" });
        if (!res.ok) { setNotFound(true); return; }
        const d: PublicEntryView = await res.json();
        setData(d);
        setLikes({ count: d.likeCount, viewerLiked: d.viewerLiked });
        setComments(d.comments);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleToggleLike = async () => {
    if (!isSignedIn || likePending || !data) return;
    setLikePending(true);
    try {
      const res = await fetch(`/api/entries/${data.entry.id}/likes`, { method: "POST", credentials: "include" });
      if (res.ok) setLikes(await res.json());
    } finally {
      setLikePending(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentPending || !isSignedIn || !data) return;
    setCommentPending(true);
    try {
      const res = await fetch(`/api/entries/${data.entry.id}/comments`, {
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
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE", credentials: "include" });
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

  if (notFound || !data) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">🗺️</div>
        <h2 className="text-xl font-serif font-bold">链接已失效</h2>
        <p className="text-muted-foreground text-sm">此分享链接已被撤销或不存在。</p>
        <a href="/" className="text-primary text-sm hover:underline">返回首页</a>
      </div>
    );
  }

  const { entry } = data;
  const photos = entry.photos ?? [];
  const travelDays = entry.endDate
    ? Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  return (
    <div className="min-h-[100dvh] bg-background">
      {lightboxIndex !== null && (
        <Lightbox photos={photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍠</span>
          <span className="font-serif font-bold text-foreground">红薯旅行日记</span>
        </div>
        <a href="/sign-in" className="text-xs text-primary hover:underline">登录 / 注册</a>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Cover */}
        {entry.coverImage && (
          <div className="rounded-2xl overflow-hidden aspect-[21/9] shadow-lg">
            <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-4">
          <h1 className="text-3xl font-serif font-bold text-foreground leading-tight">{entry.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{entry.destination}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{format(new Date(entry.startDate), "yyyy年MM月dd日")}</span>
              {entry.endDate && <span>— {format(new Date(entry.endDate), "MM月dd日")}</span>}
              <span className="text-primary ml-1">{travelDays} 天</span>
            </div>
            {entry.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-4 h-4", i < entry.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
              </div>
            )}
            {entry.mood && (
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
                {entry.mood}
              </span>
            )}
            {entry.companions && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0" />
                <span>{entry.companions}</span>
              </div>
            )}
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-border/50 text-muted-foreground">{tag.name}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">旅途照片</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="aspect-square overflow-hidden rounded-xl shadow-sm bg-muted/30 cursor-pointer" onClick={() => setLightboxIndex(idx)}>
                  <img src={photo.url} alt={photo.caption ?? "旅途照片"} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {entry.content && (
          <div className="rounded-2xl border border-border/40 bg-card/70 shadow-sm p-6">
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif text-base">
              {entry.content}
            </div>
          </div>
        )}

        {/* Social bar */}
        <div className="border-t border-border/40 pt-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleToggleLike}
              disabled={!isSignedIn || likePending}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                likes.viewerLiked
                  ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground",
                !isSignedIn && "cursor-default opacity-60"
              )}
            >
              <Heart className={cn("w-4 h-4 transition-all", likes.viewerLiked && "fill-red-500")} />
              <span>{likes.count > 0 ? likes.count : ""} 点赞</span>
            </button>

            <button
              onClick={() => setShowComments((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                showComments
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length > 0 ? comments.length : ""} 评论</span>
            </button>

            {!isSignedIn && (
              <span className="text-xs text-muted-foreground">
                <a href="/sign-in" className="text-primary hover:underline">登录</a>后可点赞和评论
              </span>
            )}
          </div>

          {/* Comments */}
          {showComments && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">还没有评论，来说点什么吧</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3 group">
                      {c.userAvatar ? (
                        <img src={c.userAvatar} alt={c.userName} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-primary text-xs font-bold">
                          {c.userName.slice(0, 1)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground">{c.userName}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MM月dd日 HH:mm")}</span>
                          {isSignedIn && c.userId === user?.id && (
                            <button onClick={() => handleDeleteComment(c.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isSignedIn ? (
                <div className="flex gap-2">
                  <img src={user?.imageUrl} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="写下你的评论…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmitComment(); } }}
                      rows={2}
                      className="resize-none bg-background border-border/60 text-sm"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Ctrl+Enter 发送</span>
                      <Button size="sm" onClick={handleSubmitComment} disabled={!commentText.trim() || commentPending} className="gap-1.5">
                        {commentPending ? "发送中..." : "发送评论"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-2">
                  <a href="/sign-in" className="text-primary hover:underline">登录</a>后参与评论
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          由 <a href="/" className="text-primary hover:underline">红薯旅行日记</a> 分享
        </div>
      </main>
    </div>
  );
}
