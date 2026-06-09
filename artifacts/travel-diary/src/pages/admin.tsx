import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  Users, TrendingUp, CreditCard, Calendar, Search,
  ChevronLeft, ChevronRight, RefreshCw, Edit2, Check, X,
  ArrowUpRight, ArrowDownRight, Clock,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Stats {
  totalUsers: number; paidUsers: number; proUsers: number; plusUsers: number;
  freeUsers: number; newThisMonth: number; cancelPending: number;
  totalEntries: number; totalPhotos: number; revenue30Days: number;
}
interface UserRow {
  userId: string; name: string; email: string | null; avatar: string | null;
  subscriptionTier: string; subscriptionExpiresAt: string | null;
  cancelAtPeriodEnd: boolean; aiChatUsed: number; aiComposeUsed: number;
  aiEnhanceUsed: number; createdAt: string;
}
interface EventRow {
  id: number; userId: string; eventType: string; fromTier: string | null;
  toTier: string | null; amountFen: number; orderNo: string | null;
  note: string | null; createdAt: string; userName: string | null;
  userEmail: string | null; userAvatar: string | null;
}

const TIER_LABELS: Record<string, string> = { free: "免费", plus: "Plus", pro: "Pro" };
const TIER_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-muted/50",
  plus: "text-blue-700 bg-blue-50",
  pro: "text-amber-700 bg-amber-50",
};
const EVENT_COLORS: Record<string, string> = {
  registered: "text-green-700 bg-green-50",
  upgraded: "text-blue-700 bg-blue-50",
  downgraded: "text-orange-700 bg-orange-50",
  cancelled: "text-red-700 bg-red-50",
  resumed: "text-emerald-700 bg-emerald-50",
  expired: "text-gray-600 bg-gray-50",
};
const EVENT_LABELS: Record<string, string> = {
  registered: "注册", upgraded: "升级", downgraded: "降级",
  cancelled: "取消", resumed: "恢复", expired: "到期",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtYuan(fen: number) {
  return fen === 0 ? "—" : `¥${(fen / 100).toFixed(2)}`;
}

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"overview" | "users" | "events">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userQ, setUserQ] = useState("");
  const [userTier, setUserTier] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editTier, setEditTier] = useState("free");

  // Events
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [eventPages, setEventPages] = useState(1);
  const [eventType, setEventType] = useState("");
  const [eventLoading, setEventLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${BASE}/api/admin/stats`, { credentials: "include" });
    if (r.status === 403) { setForbidden(true); setLoading(false); return; }
    if (r.ok) { setStats(await r.json()); }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async (page = 1, q = "", tier = "") => {
    setUserLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (tier) params.set("tier", tier);
    const r = await fetch(`${BASE}/api/admin/users?${params}`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      setUsers(d.users); setUserTotal(d.total); setUserPage(d.page); setUserPages(d.pages);
    }
    setUserLoading(false);
  }, []);

  const fetchEvents = useCallback(async (page = 1, type = "") => {
    setEventLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set("type", type);
    const r = await fetch(`${BASE}/api/admin/events?${params}`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      setEvents(d.events); setEventTotal(d.total); setEventPage(d.page); setEventPages(d.pages);
    }
    setEventLoading(false);
  }, []);

  useEffect(() => { if (isLoaded && isSignedIn) fetchStats(); }, [isLoaded, isSignedIn, fetchStats]);
  useEffect(() => { if (tab === "users") fetchUsers(1, userQ, userTier); }, [tab]);
  useEffect(() => { if (tab === "events") fetchEvents(1, eventType); }, [tab]);

  const handleTierSave = async (userId: string) => {
    await fetch(`${BASE}/api/admin/users/${userId}/tier`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: editTier }),
    });
    setEditingUser(null);
    fetchUsers(userPage, userQ, userTier);
    fetchStats();
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) { setLocation("/sign-in"); return null; }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-2xl">🚫</p>
        <p className="font-semibold text-foreground">无访问权限</p>
        <p className="text-sm text-muted-foreground">此页面仅限管理员访问</p>
        <button onClick={() => setLocation("/dashboard")} className="mt-2 text-sm text-primary hover:underline">← 返回首页</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/dashboard")} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-foreground flex-1">运营后台</h1>
        <button onClick={() => { fetchStats(); if (tab === "users") fetchUsers(userPage, userQ, userTier); if (tab === "events") fetchEvents(eventPage, eventType); }}
          className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border/40 bg-background px-4">
        {(["overview", "users", "events"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "概览" : t === "users" ? `用户 (${stats?.totalUsers ?? "…"})` : "事件日志"}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* ── Overview ── */}
        {tab === "overview" && stats && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "总用户", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
                { label: "付费用户", value: stats.paidUsers, icon: CreditCard, color: "text-amber-600" },
                { label: "本月新增", value: stats.newThisMonth, icon: TrendingUp, color: "text-green-600" },
                { label: "30天收入", value: `¥${(stats.revenue30Days / 100).toFixed(0)}`, icon: ArrowUpRight, color: "text-emerald-600" },
              ].map(c => (
                <div key={c.label} className="bg-background rounded-xl border border-border/40 p-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{c.value}</p>
                </div>
              ))}
            </div>

            {/* Tier breakdown */}
            <div className="bg-background rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">套餐分布</h2>
              {[
                { label: "Pro 探索家", count: stats.proUsers, color: "bg-amber-400" },
                { label: "Plus 旅记大师", count: stats.plusUsers, color: "bg-blue-400" },
                { label: "免费旅行者", count: stats.freeUsers, color: "bg-muted" },
              ].map(({ label, count, color }) => {
                const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* More stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "待取消到期", value: stats.cancelPending, icon: Clock },
                { label: "总旅记数", value: stats.totalEntries, icon: Calendar },
                { label: "总照片数", value: stats.totalPhotos, icon: ArrowUpRight },
              ].map(c => (
                <div key={c.label} className="bg-background rounded-xl border border-border/40 p-4 flex items-center gap-3">
                  <c.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold text-foreground">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={userQ}
                  onChange={e => setUserQ(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") fetchUsers(1, userQ, userTier); }}
                  placeholder="搜索姓名/邮箱…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select value={userTier} onChange={e => { setUserTier(e.target.value); fetchUsers(1, userQ, e.target.value); }}
                className="px-3 py-2 text-sm rounded-xl border border-border/60 bg-background focus:outline-none">
                <option value="">全部套餐</option>
                <option value="free">免费</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
              </select>
              <button onClick={() => fetchUsers(1, userQ, userTier)}
                className="px-3 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                搜索
              </button>
            </div>

            <p className="text-xs text-muted-foreground">共 {userTotal} 个用户</p>

            {userLoading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.userId} className="bg-background rounded-xl border border-border/40 p-3.5">
                    <div className="flex items-start gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium text-primary">
                          {u.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">{u.name}</span>
                          {editingUser === u.userId ? (
                            <div className="flex items-center gap-1.5">
                              <select value={editTier} onChange={e => setEditTier(e.target.value)}
                                className="text-xs px-2 py-0.5 rounded-lg border border-border bg-background">
                                <option value="free">免费</option>
                                <option value="plus">Plus</option>
                                <option value="pro">Pro</option>
                              </select>
                              <button onClick={() => handleTierSave(u.userId)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingUser(null)} className="p-1 text-muted-foreground hover:bg-muted/60 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingUser(u.userId); setEditTier(u.subscriptionTier); }}
                              className="flex items-center gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[u.subscriptionTier] ?? ""}`}>
                                {TIER_LABELS[u.subscriptionTier] ?? u.subscriptionTier}
                              </span>
                              <Edit2 className="w-3 h-3 text-muted-foreground opacity-50" />
                            </button>
                          )}
                          {u.cancelAtPeriodEnd && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-red-600 bg-red-50">待取消</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email ?? u.userId}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                          <span>注册 {fmtDate(u.createdAt)}</span>
                          {u.subscriptionExpiresAt && <span>到期 {fmtDate(u.subscriptionExpiresAt)}</span>}
                          <span>AI聊天 {u.aiChatUsed}次</span>
                          <span>AI润色 {u.aiEnhanceUsed}次</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {userPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button disabled={userPage <= 1} onClick={() => fetchUsers(userPage - 1, userQ, userTier)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground">{userPage} / {userPages}</span>
                <button disabled={userPage >= userPages} onClick={() => fetchUsers(userPage + 1, userQ, userTier)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Events ── */}
        {tab === "events" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={eventType} onChange={e => { setEventType(e.target.value); fetchEvents(1, e.target.value); }}
                className="px-3 py-2 text-sm rounded-xl border border-border/60 bg-background focus:outline-none">
                <option value="">全部事件</option>
                <option value="registered">注册</option>
                <option value="upgraded">升级付费</option>
                <option value="downgraded">降级</option>
                <option value="cancelled">取消订阅</option>
                <option value="resumed">恢复订阅</option>
                <option value="expired">到期降级</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">共 {eventTotal} 条记录</p>

            {eventLoading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="bg-background rounded-xl border border-border/40 p-3.5 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {ev.userAvatar ? (
                        <img src={ev.userAvatar} alt={ev.userName ?? ""} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {(ev.userName ?? "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{ev.userName ?? ev.userId}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[ev.eventType] ?? "bg-muted text-muted-foreground"}`}>
                          {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                        </span>
                        {ev.amountFen > 0 && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            {fmtYuan(ev.amountFen)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                        {ev.fromTier && ev.toTier && ev.fromTier !== ev.toTier && (
                          <span className="flex items-center gap-1">
                            {TIER_LABELS[ev.fromTier] ?? ev.fromTier}
                            <ArrowDownRight className="w-3 h-3 inline" />
                            {TIER_LABELS[ev.toTier] ?? ev.toTier}
                          </span>
                        )}
                        {ev.orderNo && <span>订单 {ev.orderNo.slice(-8)}</span>}
                        {ev.note && <span className="truncate max-w-[180px]">{ev.note}</span>}
                        <span>{fmtDate(ev.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">暂无事件记录</div>
                )}
              </div>
            )}

            {/* Pagination */}
            {eventPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button disabled={eventPage <= 1} onClick={() => fetchEvents(eventPage - 1, eventType)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground">{eventPage} / {eventPages}</span>
                <button disabled={eventPage >= eventPages} onClick={() => fetchEvents(eventPage + 1, eventType)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
