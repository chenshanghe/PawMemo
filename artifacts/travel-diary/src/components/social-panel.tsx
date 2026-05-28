import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { Heart, MessageCircle, Share2, Trash2, Copy, Check, Link2, X, Mail, MessageSquare, ExternalLink } from "lucide-react";
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

  const handleCreateShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/share`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setShareToken(data.token);
      }
    } finally {
      setShareLoading(false);
    }
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

  const shareUrl = shareToken
    ? `${window.location.origin}${import.meta.env.BASE_URL}share/${shareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Try native share (invokes system share sheet: WeChat, SMS, etc.)
  const [nativeShareSupported] = useState(() => typeof navigator !== "undefined" && !!navigator.share);

  const handleNativeShare = async (title: string) => {
    if (!shareUrl) return;
    try {
      await navigator.share({ title, text: `分享我的旅行日记：${title}`, url: shareUrl });
    } catch (e: any) {
      // User cancelled or not supported — fall back silently
      if (e?.name !== "AbortError") handleCopy();
    }
  };

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

      {/* Share panel */}
      {isOwner && showSharePanel && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Link2 className="w-4 h-4 text-primary" />
            分享链接
          </div>

          {visibility === "private" ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                此随记当前为<strong>私密</strong>，无法生成分享链接。
              </p>
              <p className="text-xs text-muted-foreground">
                请先在编辑页面将可见范围改为「分享可见」或「公开」。
              </p>
              <a
                href={`/entries/${entryId}/edit`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                前往编辑 →
              </a>
            </div>
          ) : shareToken ? (
            <div className="space-y-3">
              {/* URL row */}
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl ?? ""}
                  className="flex-1 text-xs bg-background border border-border/60 rounded-lg px-3 py-2 text-muted-foreground select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2">
                {/* System share sheet — triggers WeChat / SMS / etc. on mobile */}
                {nativeShareSupported && (
                  <button
                    onClick={() => handleNativeShare(document.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 text-xs font-medium text-foreground transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    分享到…
                  </button>
                )}
                {/* Email */}
                <a
                  href={shareUrl ? `mailto:?subject=${encodeURIComponent("分享一篇旅行日记")}&body=${encodeURIComponent(`我的旅行日记，点击查看：\n${shareUrl}`)}` : "#"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 text-xs font-medium text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  邮件
                </a>
                {/* SMS */}
                <a
                  href={shareUrl ? `sms:?body=${encodeURIComponent(`我的旅行日记，点击查看：${shareUrl}`)}` : "#"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 text-xs font-medium text-foreground transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                  短信
                </a>
                {/* Open in new tab */}
                <a
                  href={shareUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 text-xs font-medium text-foreground transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  预览
                </a>
              </div>

              <p className="text-xs text-muted-foreground">任何人打开此链接均可查看，无需登录。</p>
              <button
                onClick={handleRevokeShare}
                disabled={shareLoading}
                className="text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                撤销链接
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">生成链接后，任何人均可通过链接查看此随记。</p>
              <Button size="sm" onClick={handleCreateShare} disabled={shareLoading} className="gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                {shareLoading ? "生成中..." : "生成分享链接"}
              </Button>
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
