import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { Heart, MessageCircle, Share2, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EntryComment, LikesStatus } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      const res = await fetch(`${BASE}/api/entries/${entryId}/likes`, { credentials: "include" });
      if (res.ok) setLikes(await res.json());
    } catch {}
  }, [entryId]);

  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  const handleToggleLike = async () => {
    if (!isSignedIn || likePending) return;
    setLikePending(true);
    try {
      const res = await fetch(`${BASE}/api/entries/${entryId}/likes`, {
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
      const res = await fetch(`${BASE}/api/entries/${entryId}/comments`, { credentials: "include" });
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
      const res = await fetch(`${BASE}/api/entries/${entryId}/comments`, {
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
      const res = await fetch(`${BASE}/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3000);
  };

  const fetchShareStatus = useCallback(async () => {
    if (!isOwner) return;
    try {
      const res = await fetch(`${BASE}/api/entries/${entryId}/share-status`, { credentials: "include" });
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
      const res = await fetch(`${BASE}/api/entries/${entryId}/share`, {
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
      const res = await fetch(`${BASE}/api/entries/${entryId}/share`, {
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

  // One-tap share: generates token then opens the system share sheet directly.
  // Falls back to clipboard copy on desktop / browsers without Web Share API.
  const handleDirectShare = async () => {
    const token = await ensureShareToken();
    if (!token) return;
    const url = makeShareUrl(token);
    const title = document.title.replace(" - 顽童日记", "").trim() || "旅行日记";
    const text = `分享我的旅行日记：${title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (e: any) {
        // AbortError = user cancelled — that's fine, no feedback needed
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("链接已复制");
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
            onClick={handleDirectShare}
            disabled={shareLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground disabled:opacity-50"
          >
            {shareLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Share2 className="w-4 h-4" />}
            分享
          </button>
        )}

        {/* Revoke chip — appears only when a share link is active */}
        {isOwner && shareToken && (
          <button
            onClick={handleRevokeShare}
            disabled={shareLoading}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/40 transition-all disabled:opacity-50"
            title="撤销分享链接"
          >
            <X className="w-3 h-3" />撤销链接
          </button>
        )}

        {!isSignedIn && (
          <span className="text-xs text-muted-foreground ml-1">登录后可点赞和评论</span>
        )}
      </div>

      {/* Toast for non-iOS clipboard fallback */}
      {shareToast && (
        <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-[11px] text-green-700 text-center animate-in fade-in duration-150">
          {shareToast}
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
