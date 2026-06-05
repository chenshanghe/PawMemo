import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { Heart, MessageCircle, Share2, Trash2, Check, Link2, X, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EntryComment, LikesStatus } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ShareTarget =
  | "airdrop" | "wechat" | "moments" | "qq" | "weibo"
  | "xiaohongshu" | "douyin" | "dingtalk" | "feishu"
  | "notes" | "copy" | "pdf";

interface ShareModalProps {
  visibility: string;
  shareLoading: boolean;
  shareToken: string | null;
  copied: boolean;
  onAction: (action: ShareTarget) => void;
  onRevoke: () => void;
  onClose: () => void;
}

function ShareModal({ visibility, shareLoading, shareToken, copied, onAction, onRevoke, onClose }: ShareModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const APPS: { id: ShareTarget; label: string; bg: string; icon: React.ReactNode }[] = [
    { id: "airdrop",     label: "隔空投送", bg: "bg-gradient-to-br from-blue-400 to-cyan-500",   icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a7 7 0 0 1 5.94 10.67L15 13h1a4 4 0 0 0-8 0h1l-2.94 2.67A7 7 0 0 1 12 5zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg> },
    { id: "wechat",      label: "微信",     bg: "bg-green-500",                                   icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.57 2.78 4.71l-.55 2.08 2.36-1.18c.87.24 1.88.39 2.91.39.28 0 .56-.01.83-.04a5.6 5.6 0 0 1-.33-1.87c0-3.12 2.88-5.59 6.5-5.59.28 0 .56.02.83.04C16.73 6.38 13.4 4 9.5 4zM7 8.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm2.5 1.5c-2.9 0-5.5 1.86-5.5 4.25 0 2.39 2.6 4.25 5.5 4.25.82 0 1.63-.14 2.35-.38l1.9.95-.44-1.68A4.38 4.38 0 0 0 20 14.25C20 11.86 17.4 10 14.5 10zm-2 3a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm4 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg> },
    { id: "moments",     label: "朋友圈",   bg: "bg-green-600",                                   icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4.5" r="1.8"/><circle cx="19.5" cy="8.25" r="1.8"/><circle cx="19.5" cy="15.75" r="1.8"/><circle cx="12" cy="19.5" r="1.8"/><circle cx="4.5" cy="15.75" r="1.8"/><circle cx="4.5" cy="8.25" r="1.8"/></svg> },
    { id: "qq",          label: "QQ",       bg: "bg-sky-500",                                     icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 13.5c-.28.41-.7.5-1.16.5H8.66c-.46 0-.88-.09-1.16-.5C6.17 13.6 6 11.64 6 11c0-2.12 1.26-3.9 3.04-4.72A2.5 2.5 0 0 1 12 4.5a2.5 2.5 0 0 1 2.96 1.78C16.74 7.1 18 8.88 18 11c0 .64-.17 2.6-1.5 4.5z"/></svg> },
    { id: "weibo",       label: "微博",     bg: "bg-red-500",                                     icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M10.1 19.32c-3.59.35-6.7-1.27-6.93-3.63-.23-2.36 2.49-4.56 6.09-4.92 3.6-.36 6.7 1.27 6.94 3.63.23 2.36-2.49 4.56-6.1 4.92zM8.7 16.9a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zm8.43-7.05c.75 0 1.36.6 1.36 1.35s-.61 1.36-1.36 1.36-1.35-.61-1.35-1.36.6-1.35 1.35-1.35zm-4.07-3.61c1.74 0 3.16 1.42 3.16 3.16s-1.42 3.17-3.16 3.17-3.16-1.42-3.16-3.17 1.41-3.16 3.16-3.16z"/></svg> },
    { id: "xiaohongshu", label: "小红书",   bg: "bg-rose-600",                                    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5" stroke="rgb(225,29,72)" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: "douyin",      label: "抖音",     bg: "bg-gray-900",                                    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.5a8.16 8.16 0 0 0 4.78 1.52V7.57a4.85 4.85 0 0 1-1.01-.88z"/></svg> },
    { id: "dingtalk",    label: "钉钉",     bg: "bg-blue-600",                                    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2L3 7v10l9 5 9-5V7L12 2zm0 3.5l5.5 3.06v6.88L12 18.5l-5.5-3.06V8.56L12 5.5zM9 11l5 2.5-5 2.5V11z"/></svg> },
    { id: "feishu",      label: "飞书",     bg: "bg-indigo-500",                                  icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 3L4 9v12h16V9L12 3zm0 2.5l6 4.5v9H6V10l6-4.5zM10 13h4v5h-4z"/></svg> },
    { id: "notes",       label: "备忘录",   bg: "bg-yellow-400",                                  icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/></svg> },
    { id: "copy",        label: copied ? "已复制" : "复制链接", bg: copied ? "bg-green-500" : "bg-slate-500", icon: copied ? <Check className="w-6 h-6 text-white" /> : <Link2 className="w-6 h-6 text-white" /> },
    { id: "pdf",         label: "保存PDF",  bg: "bg-red-600",                                     icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M20 2H8L4 6v16h16V2zm-9 13H9v-5h2c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2zm4-4h-1v4h-1v-4h-1v-1h3v1zm3 0h-2v1h2v1h-2v2h-1v-5h3v1zM11 13h1v2h-1v-2z"/></svg> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl bg-background shadow-2xl border border-border/40 overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
          <span className="font-semibold text-sm text-foreground">分享日记</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Private notice */}
        {visibility === "private" && (
          <div className="flex items-center gap-1.5 px-5 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-700">
            <Lock className="w-3 h-3 shrink-0" />
            私密随记将通过专属链接分享，对方无需登录即可查看
          </div>
        )}

        {shareLoading && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground border-b border-border/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />生成链接中…
          </div>
        )}

        {/* App grid */}
        <div className="p-5 grid grid-cols-4 gap-x-2 gap-y-5">
          {APPS.map(({ id, label, bg, icon }) => (
            <button
              key={id}
              onClick={() => onAction(id)}
              disabled={shareLoading && id !== "pdf"}
              className="flex flex-col items-center gap-1.5 group disabled:opacity-50"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-active:scale-90 group-hover:scale-105", bg)}>
                {icon}
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        {shareToken && (
          <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">任何人通过链接可查看，无需登录</span>
            <button
              onClick={onRevoke}
              disabled={shareLoading}
              className="text-[11px] text-destructive hover:underline flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />撤销链接
            </button>
          </div>
        )}

        {/* Bottom safe area (mobile) */}
        <div className="h-safe-bottom sm:hidden" />
      </div>
    </div>
  );
}

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
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

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

  const handleShareAction = async (action: ShareTarget) => {
    if (action === "pdf") {
      window.print();
      return;
    }
    const token = await ensureShareToken();
    if (!token) return;
    const url = makeShareUrl(token);
    const title = document.title.replace(" - 顽童日记", "").trim() || "旅行日记";
    const text = `分享我的旅行日记：${title}`;

    const copyToClipboard = async () => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };

    const nativeShare = async (targetHint?: string) => {
      if (navigator.share) {
        try {
          await navigator.share({ title, text: targetHint ? `${text}\n（${targetHint}）` : text, url });
          return true;
        } catch (e: any) {
          if (e?.name === "AbortError") return true;
        }
      }
      return false;
    };

    switch (action) {
      case "airdrop":
        if (!await nativeShare("隔空投送")) await copyToClipboard();
        break;
      case "wechat":
        if (!await nativeShare("微信")) await copyToClipboard();
        break;
      case "moments":
        if (!await nativeShare("朋友圈")) await copyToClipboard();
        break;
      case "qq":
        if (!await nativeShare("QQ")) {
          window.open(`https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent("顽童日记")}`, "_blank");
        }
        break;
      case "weibo":
        window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, "_blank");
        break;
      case "xiaohongshu":
        await copyToClipboard();
        break;
      case "douyin":
        await copyToClipboard();
        break;
      case "dingtalk":
        if (!await nativeShare("钉钉")) {
          window.open(`dingtalk://dingtalkclient/action/share?sourceType=link&contentType=url&url=${encodeURIComponent(url)}&content=${encodeURIComponent(text)}`, "_blank");
          setTimeout(async () => { await copyToClipboard(); }, 500);
        }
        break;
      case "feishu":
        if (!await nativeShare("飞书")) {
          window.open(`https://applink.feishu.cn/client/message/share?content=${encodeURIComponent(url)}`, "_blank");
          setTimeout(async () => { await copyToClipboard(); }, 500);
        }
        break;
      case "notes":
        if (!await nativeShare("备忘录")) await copyToClipboard();
        break;
      case "copy":
        await copyToClipboard();
        break;
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

      {/* Share modal */}
      {isOwner && showSharePanel && (
        <ShareModal
          visibility={visibility}
          shareLoading={shareLoading}
          shareToken={shareToken}
          copied={copied}
          onAction={handleShareAction}
          onRevoke={handleRevokeShare}
          onClose={() => setShowSharePanel(false)}
        />
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
