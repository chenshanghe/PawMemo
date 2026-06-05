import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import { Heart, MessageCircle, Share2, Trash2, X, Loader2, Link2, Check, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EntryComment, LikesStatus } from "@workspace/api-client-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SocialPanelProps {
  entryId: number;
  isOwner: boolean;
  visibility?: string;
}

export function SocialPanel({ entryId, isOwner, visibility = "private" }: SocialPanelProps) {
  const { user, isSignedIn } = useUser();
  const isOnline = useOnlineStatus();

  // ── Offline action toast ────────────────────────────────────────────────────
  const [offlineToast, setOfflineToast] = useState(false);
  const showOfflineHint = () => {
    setOfflineToast(true);
    setTimeout(() => setOfflineToast(false), 3000);
  };

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
    if (!isOnline) { showOfflineHint(); return; }
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
    if (!isOnline) { showOfflineHint(); return; }
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
  const [showDesktopPanel, setShowDesktopPanel] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close desktop panel on outside click
  useEffect(() => {
    if (!showDesktopPanel) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowDesktopPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDesktopPanel]);

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
    if (!isOnline) { showOfflineHint(); return null; }
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
    if (!isOnline) { showOfflineHint(); return; }
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

  // One-tap share: generates token then opens the system share sheet if available,
  // or falls back to a custom panel with manual copy / platform links.
  const handleDirectShare = async () => {
    const token = await ensureShareToken();
    if (!token) return;

    if (navigator.share) {
      const url = makeShareUrl(token);
      const title = document.title.replace(" - 顽童日记", "").trim() || "旅行日记";
      try {
        await navigator.share({ title, text: `分享我的旅行日记：${title}`, url });
      } catch {
        // AbortError = user cancelled — fine
      }
    } else {
      // Fallback: toggle the custom share panel
      setShowDesktopPanel((v) => !v);
    }
  };

  const handleCopyLink = async () => {
    const token = await ensureShareToken();
    if (!token) return;
    try {
      await navigator.clipboard.writeText(makeShareUrl(token));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast("复制失败，请手动复制");
    }
  };

  // Build share URLs for each platform (requires a valid token)
  const buildPlatformUrl = (platform: "weibo" | "qq", token: string) => {
    const shareUrl = encodeURIComponent(makeShareUrl(token));
    const title = encodeURIComponent(
      (document.title.replace(" - 顽童日记", "").trim() || "旅行日记") + " — 顽童日记"
    );
    if (platform === "weibo") {
      return `https://service.weibo.com/share/share.php?url=${shareUrl}&title=${title}`;
    }
    return `https://connect.qq.com/widget/shareqq/index.html?url=${shareUrl}&title=${title}`;
  };

  return (
    <div className="border-t border-border/40 pt-6 space-y-4">
      {/* Offline action toast */}
      {offlineToast && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800 animate-in fade-in duration-150">
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>当前离线，此操作需要网络连接</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Like */}
        <button
          onClick={handleToggleLike}
          disabled={!isSignedIn || likePending}
          title={!isOnline ? "离线时无法点赞" : undefined}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            likes.viewerLiked
              ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
              : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground",
            (!isSignedIn || !isOnline) && "cursor-default opacity-60"
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
          <div ref={shareRef} className="relative">
            <button
              onClick={handleDirectShare}
              disabled={shareLoading}
              title={!isOnline ? "离线时无法分享" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                showDesktopPanel
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground",
                "disabled:opacity-50"
              )}
            >
              {shareLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Share2 className="w-4 h-4" />}
              分享
            </button>

            {/* Desktop share panel */}
            {showDesktopPanel && shareToken && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-popover border border-border/60 shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-xs text-muted-foreground">分享到</p>
                </div>

                {/* Copy link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  {linkCopied
                    ? <Check className="w-4 h-4 text-green-500 shrink-0" />
                    : <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={linkCopied ? "text-green-600 font-medium" : ""}>
                    {linkCopied ? "链接已复制！" : "复制链接"}
                  </span>
                </button>

                {/* WeChat hint */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#07c160">
                    <path d="M8.5 3C4.36 3 1 5.9 1 9.5c0 2.01 1.05 3.81 2.7 5l-.6 2.1 2.4-1.2c.78.22 1.62.34 2.5.34.23 0 .46-.01.68-.03A5.96 5.96 0 008 14c0-3.31 3.13-6 7-6h.26C14.44 5.62 11.74 3 8.5 3zM6 7.5a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z"/>
                    <path d="M15 10c-3.31 0-6 2.24-6 5s2.69 5 6 5c.72 0 1.4-.12 2.03-.33l1.97 1-.5-1.74A4.97 4.97 0 0021 15c0-2.76-2.69-5-6-5zm-2 4a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                  <span className="text-foreground/80">微信 / 朋友圈</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">复制链接粘贴</span>
                </button>

                {/* Weibo */}
                <a
                  href={buildPlatformUrl("weibo", shareToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowDesktopPanel(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#e6162d">
                    <path d="M10.13 12.01c-2.53.27-4.45 2.12-4.28 4.14.17 2.03 2.36 3.44 4.9 3.17 2.53-.27 4.45-2.12 4.28-4.14-.17-2.03-2.37-3.44-4.9-3.17zm2.28 5.4c-.57.72-1.43 1.07-2.15.89-.71-.18-1.01-.87-.68-1.55.32-.66 1.12-1.03 1.83-.87.71.18 1.1.8.9 1.38l.1.15zm.94-1.97c-.16.23-.46.3-.67.17-.21-.13-.25-.43-.1-.65.16-.23.46-.3.67-.17.21.13.25.42.1.65z"/>
                    <path d="M20.2 7.81c-.35-.11-.59-.18-.41-.65.4-1.02.44-1.9.01-2.52-.8-1.17-2.65-1.11-4.87-.11 0 0-.7.3-.52-.25.35-1.12.3-2.05-.24-2.59-.12-.12-1.35-1.12-4.46 1.47C7.46 5.09 5.39 7.68 5.39 9.97c0 4.44 4.93 7.14 9.76 7.14 6.32 0 10.52-4 10.52-7.17 0-1.91-1.39-2.99-5.47-2.13zm.45 5.26c-.7 1.93-2.92 3.28-5.47 3.28-2.55 0-4.52-1.38-4.38-3.09.14-1.71 2.38-3.07 4.93-3.01 2.55.06 4.63 1.54 4.92 2.82z"/>
                  </svg>
                  <span>微博</span>
                </a>

                {/* QQ */}
                <a
                  href={buildPlatformUrl("qq", shareToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowDesktopPanel(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1d7ed8">
                    <path d="M12 2C6.48 2 2 6.34 2 11.68c0 2.86 1.27 5.43 3.29 7.22-.1.63-.48 2.29-1.29 3.1 0 0 2.49-.62 4.32-2.06.99.27 2.04.43 3.12.43v-.01c.07 0 .14.01.21.01 5.52 0 10-4.34 10-9.68S17.52 2 12 2zm-1.5 13.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v4.5zm5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v4.5z"/>
                  </svg>
                  <span>QQ</span>
                </a>
              </div>
            )}
          </div>
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

          {!isOnline ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-700">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>恢复网络后即可发表评论</span>
            </div>
          ) : isSignedIn ? (
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
