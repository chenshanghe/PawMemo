import React, { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Bell, Heart, MessageCircle, UserPlus, Check, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Notif {
  id: number;
  type: "like" | "comment" | "follow";
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  entryId: number | null;
  entryTitle: string | null;
  body: string;
  read: boolean;
  createdAt: string;
}

function NotifIcon({ type }: { type: Notif["type"] }) {
  if (type === "like") return <Heart className="w-4 h-4 text-rose-500" />;
  if (type === "comment") return <MessageCircle className="w-4 h-4 text-blue-500" />;
  return <UserPlus className="w-4 h-4 text-emerald-500" />;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`${BASE}/api/notifications`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setNotifs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    await fetch(`${BASE}/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await fetch(`${BASE}/api/notifications/read-all`, { method: "POST", credentials: "include" });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-foreground" />
            <h1 className="text-lg font-bold text-foreground">消息通知</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Check className="w-3.5 h-3.5" />全部已读
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">加载中…</div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
              <Bell className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">还没有消息</p>
              <p className="text-xs text-muted-foreground">有人点赞、评论或关注你时，会在这里提醒</p>
            </div>
            <Link href="/square" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              去广场逛逛
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {notifs.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markRead(n.id); }}
                className={`relative flex items-start gap-3 p-3.5 rounded-xl transition-colors cursor-pointer ${
                  n.read ? "bg-card border border-border/30" : "bg-primary/5 border border-primary/20"
                }`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                )}

                {/* Actor avatar */}
                <div className="w-9 h-9 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {n.actorAvatar
                    ? <img src={n.actorAvatar} alt="" className="w-full h-full object-cover" />
                    : n.actorName[0]
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <NotifIcon type={n.type} />
                    <span className="text-sm font-semibold text-foreground truncate">{n.actorName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  {n.entryId && n.entryTitle && (
                    <Link
                      href={`/entries/${n.entryId}`}
                      onClick={e => e.stopPropagation()}
                      className="mt-1 flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate">{n.entryTitle}</span>
                    </Link>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {format(new Date(n.createdAt), "M月d日 HH:mm", { locale: zhCN })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
