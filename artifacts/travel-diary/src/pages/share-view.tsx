import React, { useEffect, useState, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { generateShareCard } from "@/lib/shareCard";

const isWechatBrowser = () => /MicroMessenger/i.test(navigator.userAgent);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function withToken(url: string | null | undefined, token: string): string {
  if (!url) return "";
  if (!url.startsWith("/api/storage/objects/") && !url.includes("/api/storage/objects/")) return url;
  if (url.includes("shareToken=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}shareToken=${encodeURIComponent(token)}`;
}

import { useUser } from "@clerk/react";
import { MapPin, CalendarDays, Star, Heart, MessageCircle, ChevronLeft, ChevronRight, X, Users, Loader2, Trash2, Download, Share2, Link2, Check } from "lucide-react";
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [likes, setLikes] = useState({ count: 0, viewerLiked: false });
  const [likePending, setLikePending] = useState(false);
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [cardGenerating, setCardGenerating] = useState(false);
  const [wechatGuideOpen, setWechatGuideOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const showShareToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = data ? `${data.entry.title} — 顽童日记` : "顽童日记";

    if (isWechatBrowser()) {
      setWechatGuideOpen(true);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // AbortError = user cancelled
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showShareToast("复制失败，请手动复制地址");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/share/${token}`, { credentials: "include" });
        if (res.status === 403) { setIsPrivate(true); setLoading(false); return; }
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
      const res = await fetch(`${BASE}/api/entries/${data.entry.id}/likes?shareToken=${encodeURIComponent(token)}`, { method: "POST", credentials: "include" });
      if (res.ok) setLikes(await res.json());
    } finally {
      setLikePending(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentPending || !isSignedIn || !data) return;
    setCommentPending(true);
    try {
      const res = await fetch(`${BASE}/api/entries/${data.entry.id}/comments?shareToken=${encodeURIComponent(token)}`, {
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

  const handleDownloadCard = async () => {
    if (!data || cardGenerating) return;
    setCardGenerating(true);
    try {
      const { entry } = data;
      const blob = await generateShareCard({
        title: entry.title,
        destination: entry.destination,
        date: entry.startDate ? format(new Date(entry.startDate), "yyyy年M月d日") : null,
        rating: entry.rating ?? null,
        coverUrl: withToken(entry.photos?.[0]?.url ?? entry.coverImage, token) || null,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entry.title || "旅行日记"}-分享卡片.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("生成分享卡片失败", e);
    } finally {
      setCardGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-3xl">🔒</div>
        <h2 className="text-xl font-serif font-bold">此随记已设为私密</h2>
        <p className="text-muted-foreground text-sm">作者已将该随记改为私密，链接暂时无法访问。</p>
        <a href="/" className="text-primary text-sm hover:underline">返回首页</a>
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

  const ogTitle = `${entry.title} — 顽童日记`;
  const ogDesc = entry.destination
    ? `📍 ${entry.destination}${entry.content ? " · " + entry.content.slice(0, 80) : ""}`
    : entry.content?.slice(0, 100) ?? "旅行日记";
  const ogImage = withToken(photos[0]?.url ?? entry.coverImage, token);

  return (
    <div className="min-h-[100dvh] bg-background">
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDesc} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:type" content="article" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos.map(p => ({ ...p, url: withToken(p.url, token) }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* WeChat in-app guide overlay */}
      {wechatGuideOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setWechatGuideOpen(false)}
        >
          <div
            className="bg-background rounded-t-2xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#07c160">
                  <path d="M8.5 3C4.36 3 1 5.9 1 9.5c0 2.01 1.05 3.81 2.7 5l-.6 2.1 2.4-1.2c.78.22 1.62.34 2.5.34.23 0 .46-.01.68-.03A5.96 5.96 0 008 14c0-3.31 3.13-6 7-6h.26C14.44 5.62 11.74 3 8.5 3zM6 7.5a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z"/>
                  <path d="M15 10c-3.31 0-6 2.24-6 5s2.69 5 6 5c.72 0 1.4-.12 2.03-.33l1.97 1-.5-1.74A4.97 4.97 0 0021 15c0-2.76-2.69-5-6-5zm-2 4a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
                <span className="font-semibold text-foreground">分享到微信</span>
              </div>
              <button onClick={() => setWechatGuideOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-3 bg-muted/40 rounded-xl p-4">
              <span className="text-2xl leading-none mt-0.5">☝️</span>
              <div>
                <p className="font-medium text-foreground">点击右上角 ···</p>
                <p className="text-sm text-muted-foreground mt-1">
                  选择「发送给朋友」发给联系人，<br />
                  或「分享到朋友圈」发布动态。
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch {}
                setWechatGuideOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              复制链接备用
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="顽童日记" className="w-7 h-7 object-contain shrink-0" />
          <span className="font-serif font-bold text-foreground">顽童日记</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Share button — system share sheet on mobile, guide in WeChat, copy on desktop */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkCopied
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{linkCopied ? "已复制" : "分享"}</span>
          </button>
          <button
            onClick={handleDownloadCard}
            disabled={cardGenerating}
            title="下载分享卡片"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {cardGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">分享卡片</span>
          </button>
          <a href="/sign-in" className="text-xs text-primary hover:underline">登录 / 注册</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Cover */}
        {entry.coverImage && (
          <div className="rounded-2xl overflow-hidden aspect-[21/9] shadow-lg">
            <img src={withToken(entry.coverImage, token)} alt={entry.title} loading="lazy" className="w-full h-full object-cover" />
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
                  <img src={withToken(photo.url, token)} alt={photo.caption ?? "旅途照片"} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
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
          由 <a href="/" className="text-primary hover:underline">顽童日记</a> 分享
        </div>
      </main>
    </div>
  );
}
