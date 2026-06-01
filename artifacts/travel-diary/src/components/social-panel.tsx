import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { Heart, MessageCircle, Share2, Trash2, Copy, Check, Link2, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EntryComment, LikesStatus } from "@workspace/api-client-react";

interface SocialPanelProps {
  entryId: number;
  isOwner: boolean;
  visibility?: string;
}

export function SocialPanel({ entryId, isOwner, visibility = "private" }: SocialPanelProps) {
  const { user, isSignedIn } = useUser();

  // ── Likes ──────────────────────────────────────────────────────────────────
  const [likes, setLikes] = useState<LikesStatus>({ count: 0, viewerLiked: false });
  const [likePending, setLikePending] = useState(false);

  const fetchLikes = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}/likes`, { credentials: "include" });
      if (res.ok) setLikes(await res.json());
    } catch {}
  }, [entryId]);

  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  const handleToggleLike = async () => {
    if (!isSignedIn || likePending) return;
    setLikePending(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/likes`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setLikes(await res.json());
    } finally {
      setLikePending(false);
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPending, setCommentPending] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, { credentials: "include" });
      if (res.ok) setComments(await res.json());
    } catch {}
  }, [entryId]);

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments, fetchComments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentPending || !isSignedIn) return;
    setCommentPending(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, {
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
        const newComment: EntryComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
      }
    } finally {
      setCommentPending(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const fetchShareStatus = useCallback(async () => {
    if (!isOwner) return;
    try {
      const res = await fetch(`/api/entries/${entryId}/share-status`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setShareToken(data.token);
      }
    } catch {}
  }, [entryId, isOwner]);

  useEffect(() => { fetchShareStatus(); }, [fetchShareStatus]);

  const ensureShareToken = async (): Promise<string | null> => {
    if (shareToken) return shareToken;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/share`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setShareToken(data.token);
        return data.token;
      }
    } finally {
      setShareLoading(false);
    }
    return null;
  };

  const handleRevokeShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/share`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setShareToken(null);
    } finally {
      setShareLoading(false);
    }
  };

  const makeShareUrl = (token: string) =>
    `${window.location.origin}${import.meta.env.BASE_URL}share/${token}`;

  const handleShareAction = async (action: "copy" | "native" | "weibo" | "qq") => {
    const token = await ensureShareToken();
    if (!token) return;
    const url = makeShareUrl(token);
    const title = document.title.replace(" - 红薯旅行日记", "").trim() || "旅行日记";

    if (action === "copy") {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (action === "native") {
      try {
        await navigator.share({ title, text: `分享我的旅行日记：${title}`, url });
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else if (action === "weibo") {
      window.open(
        `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`分享我的旅行日记：${title}`)}`,
        "_blank"
      );
    } else if (action === "qq") {
      window.open(
        `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent("红薯旅行日记")}`,
        "_blank"
      );
    }
  };

  const nativeShareSupported = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="border-t border-border/40 pt-6 space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Like */}
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
          <Heart className={cn("w-4 h-4 transition-all", likes.viewerLiked && "fill-red-500")} />
          <span>{likes.count > 0 ? likes.count : ""} 点赞</span>
        </button>

        {/* Comments toggle */}
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

        {/* Share (owner only) */}
        {isOwner && (
          <button
            onClick={() => setShowSharePanel((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              showSharePanel
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Share2 className="w-4 h-4" />
            分享
          </button>
        )}

        {!isSignedIn && (
          <span className="text-xs text-muted-foreground ml-1">登录后可点赞和评论</span>
        )}
      </div>

      {/* Share sheet */}
      {isOwner && showSharePanel && (
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {/* Private notice */}
          {visibility === "private" && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-700">
              <Lock className="w-3 h-3 shrink-0" />
              私密随记将通过专属链接分享，对方无需登录即可查看
            </div>
          )}

          {/* Share options */}
          <div className="divide-y divide-border/40">
            {/* Copy link */}
            <button
              onClick={() => handleShareAction("copy")}
              disabled={shareLoading}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                {shareLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : copied ? <Check className="w-5 h-5 text-white" /> : <Link2 className="w-5 h-5 text-white" />}
              </div>
              <span className="text-sm font-medium text-foreground">
                {shareLoading ? "生成链接中…" : copied ? "已复制！" : "复制链接"}
              </span>
            </button>

            {/* WeChat / native share */}
            {nativeShareSupported && (
              <button
                onClick={() => handleShareAction("native")}
                disabled={shareLoading}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.57 2.78 4.71l-.55 2.08 2.36-1.18c.87.24 1.88.39 2.91.39.28 0 .56-.01.83-.04a5.6 5.6 0 0 1-.33-1.87c0-3.12 2.88-5.59 6.5-5.59.28 0 .56.02.83.04C16.73 6.38 13.4 4 9.5 4zM7 8.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm2.5 1.5c-2.9 0-5.5 1.86-5.5 4.25 0 2.39 2.6 4.25 5.5 4.25.82 0 1.63-.14 2.35-.38l1.9.95-.44-1.68A4.38 4.38 0 0 0 20 14.25C20 11.86 17.4 10 14.5 10zm-2 3a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm4 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>
                </div>
                <span className="text-sm font-medium text-foreground">微信</span>
              </button>
            )}

            {/* Weibo */}
            <button
              onClick={() => handleShareAction("weibo")}
              disabled={shareLoading}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM8.5 17.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 8.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-4.5-4c1.93 0 3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5S11 9.93 11 8s1.57-3.5 3.5-3.5z"/></svg>
              </div>
              <span className="text-sm font-medium text-foreground">新浪微博</span>
            </button>

            {/* QQ Space */}
            <button
              onClick={() => handleShareAction("qq")}
              disabled={shareLoading}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="text-sm font-medium text-foreground">QQ空间</span>
            </button>
          </div>

          {/* Revoke link footer */}
          {shareToken && (
            <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">任何人通过链接可查看，无需登录</span>
              <button
                onClick={handleRevokeShare}
                disabled={shareLoading}
                className="text-[11px] text-destructive hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />撤销链接
              </button>
            </div>
          )}
        </div>
      )}

      {/* Comments section */}
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.createdAt), "MM月dd日 HH:mm")}
                      </span>
                      {(isSignedIn && c.userId === user?.id) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
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
              <img
                src={user?.imageUrl}
                alt={user?.fullName ?? ""}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="写下你的评论…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  rows={2}
                  className="resize-none bg-background border-border/60 text-sm"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ctrl+Enter 发送</span>
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || commentPending}
                    className="gap-1.5"
                  >
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
  );
}
