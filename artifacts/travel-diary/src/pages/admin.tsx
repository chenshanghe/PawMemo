import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  LayoutDashboard, Users, Activity, TrendingUp,
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Edit2, Check, X, ExternalLink, ArrowUpRight,
  ArrowDownRight, Minus, ChevronDown, ChevronUp,
  CreditCard, BookOpen, Image, Clock, LogOut,
  Brain, Plus, Eye, EyeOff, Trash2, FileText, GripVertical,
  MessageSquare, Flag, CheckCircle, DollarSign, Zap,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; paidUsers: number; proUsers: number; plusUsers: number;
  freeUsers: number; newThisMonth: number; cancelPending: number;
  totalEntries: number; totalPhotos: number; revenue30Days: number;
}
interface TrendPoint { day: string; value: number }
interface Trends { users: TrendPoint[]; revenue: TrendPoint[] }
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

type Page = "overview" | "users" | "events" | "revenue" | "knowledge" | "tiers" | "engagement" | "mrr" | "moderation";
type SortDir = "asc" | "desc";

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_LABEL: Record<string, string> = { free: "免费", plus: "Plus", pro: "Pro" };
const TIER_DOT: Record<string, string> = {
  free: "bg-slate-400", plus: "bg-blue-500", pro: "bg-amber-500",
};
const TIER_BADGE: Record<string, string> = {
  free: "text-slate-500 bg-slate-100",
  plus: "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  pro: "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
};
const EVENT_BADGE: Record<string, string> = {
  registered: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
  upgraded: "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  downgraded: "text-orange-700 bg-orange-50 ring-1 ring-orange-200",
  cancelled: "text-red-700 bg-red-50 ring-1 ring-red-200",
  resumed: "text-teal-700 bg-teal-50 ring-1 ring-teal-200",
  expired: "text-slate-600 bg-slate-100",
};
const EVENT_LABEL: Record<string, string> = {
  registered: "注册", upgraded: "付费升级", downgraded: "降级",
  cancelled: "取消订阅", resumed: "恢复订阅", expired: "到期降级",
};
const TIER_COLORS_PIE = ["#94a3b8", "#3b82f6", "#f59e0b"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (s: string | null, opts?: Intl.DateTimeFormatOptions) =>
  s ? new Date(s).toLocaleString("zh-CN", opts ?? { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDay = (s: string) => s.slice(5);
const fmtYuan = (fen: number) => fen ? `¥${(fen / 100).toFixed(2)}` : "—";
const apiFetch = (path: string) => fetch(`${BASE}${path}`, { credentials: "include" }).then(r => r.json());

function trendPct(data: TrendPoint[]): number | null {
  if (data.length < 2) return null;
  const half = Math.floor(data.length / 2);
  const prev = data.slice(0, half).reduce((s, d) => s + d.value, 0);
  const curr = data.slice(half).reduce((s, d) => s + d.value, 0);
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",    label: "概览",    icon: LayoutDashboard },
  { id: "users",       label: "用户",    icon: Users },
  { id: "events",      label: "事件日志", icon: Activity },
  { id: "engagement",  label: "活跃用户", icon: Zap },
  { id: "mrr",         label: "MRR",     icon: DollarSign },
  { id: "revenue",     label: "收入分析", icon: TrendingUp },
  { id: "moderation",  label: "反馈举报", icon: Flag },
  { id: "knowledge",   label: "AI 知识库", icon: Brain },
  { id: "tiers",       label: "套餐配置", icon: CreditCard },
] as const;

function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [, setLocation] = useLocation();
  return (
    <aside className="fixed left-0 top-0 h-full w-52 bg-slate-900 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mb-1">运营后台</p>
        <p className="text-white font-semibold text-sm">顽童记</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPage(id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              page === id
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
        <button onClick={() => setLocation("/dashboard")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <LogOut className="w-4 h-4" />
          返回应用
        </button>
      </div>
    </aside>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; trend?: number | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      {trend !== undefined && trend !== null && (
        <p className={`text-xs flex items-center gap-1 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}% vs 前半期
        </p>
      )}
      {(trend === null || trend === undefined) && <p className="text-xs text-slate-400">—</p>}
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────
function TrendChart({ data, color, label, fmt: fmtVal }: {
  data: TrendPoint[]; color: string; label: string; fmt?: (v: number) => string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
            tickFormatter={fmtVal} width={fmtVal ? 48 : 28} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(v: number) => [fmtVal ? fmtVal(v) : v, label]}
            labelFormatter={(l: string) => l}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            fill={`url(#g-${label})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Overview Page ─────────────────────────────────────────────────────────────
function OverviewPage({ stats, trends, events }: {
  stats: Stats; trends: Trends; events: EventRow[];
}) {
  const userTrend = trendPct(trends.users);
  const revTrend = trendPct(trends.revenue);

  const pieData = [
    { name: "免费", value: stats.freeUsers },
    { name: "Plus", value: stats.plusUsers },
    { name: "Pro", value: stats.proUsers },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="总用户" value={stats.totalUsers.toLocaleString()} icon={Users} color="bg-blue-500" trend={userTrend} />
        <KpiCard label="付费用户" value={stats.paidUsers.toLocaleString()} icon={CreditCard} color="bg-amber-500"
          trend={stats.totalUsers > 0 ? Math.round((stats.paidUsers / stats.totalUsers) * 100) : null} />
        <KpiCard label="本月新增" value={stats.newThisMonth.toLocaleString()} icon={ArrowUpRight} color="bg-emerald-500" trend={null} />
        <KpiCard label="30天收入" value={`¥${(stats.revenue30Days / 100).toFixed(0)}`} icon={TrendingUp} color="bg-violet-500" trend={revTrend} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrendChart data={trends.users} color="#3b82f6" label="新增用户（30天）" />
        <TrendChart data={trends.revenue} color="#8b5cf6" label="收入趋势（30天）"
          fmt={v => v >= 100 ? `¥${(v / 100).toFixed(0)}` : `${v}分`} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tier distribution pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">套餐分布</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={TIER_COLORS_PIE[i]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
              <Tooltip formatter={(v: number) => [`${v} 人`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Content stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">内容数据</p>
          <div className="space-y-3">
            {[
              { label: "总旅记数", value: stats.totalEntries, icon: BookOpen, color: "text-blue-500" },
              { label: "总照片数", value: stats.totalPhotos, icon: Image, color: "text-violet-500" },
              { label: "待取消到期", value: stats.cancelPending, icon: Clock, color: "text-red-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent events */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">最近事件</p>
          <div className="space-y-2.5">
            {events.slice(0, 5).map(ev => (
              <div key={ev.id} className="flex items-center gap-2.5">
                {ev.userAvatar
                  ? <img src={ev.userAvatar} className="w-6 h-6 rounded-full object-cover shrink-0" />
                  : <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-500 shrink-0">{(ev.userName ?? "?")[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">{ev.userName ?? ev.userId}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${EVENT_BADGE[ev.eventType] ?? "bg-slate-100 text-slate-600"}`}>
                  {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                </span>
              </div>
            ))}
            {events.length === 0 && <p className="text-xs text-slate-400">暂无事件</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Detail Panel ─────────────────────────────────────────────────────────
function UserDetailPanel({ user, onClose, onTierSave }: {
  user: UserRow | null;
  onClose: () => void;
  onTierSave: (userId: string, tier: string) => Promise<void>;
}) {
  const [editTier, setEditTier] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (user) setEditTier(user.subscriptionTier); }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await onTierSave(user.userId, editTier);
    setSaving(false);
  };

  return (
    <>
      {user && <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 z-40 transition-transform duration-200 ${user ? "translate-x-0" : "translate-x-full"}`}>
        {user && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <p className="font-semibold text-slate-900 text-sm">用户详情</p>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Profile */}
              <div className="flex items-center gap-3">
                {user.avatar
                  ? <img src={user.avatar} className="w-12 h-12 rounded-full object-cover" />
                  : <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-semibold text-slate-500">{user.name[0]}</div>
                }
                <div>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email ?? user.userId}</p>
                </div>
              </div>

              {/* Subscription */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">订阅</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">当前套餐</span>
                  <select value={editTier} onChange={e => setEditTier(e.target.value)}
                    className="text-sm px-2 py-1 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="free">免费</option>
                    <option value="plus">Plus</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                {editTier !== user.subscriptionTier && (
                  <button onClick={handleSave} disabled={saving}
                    className="w-full py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? "保存中…" : "确认修改"}
                  </button>
                )}
                {user.subscriptionExpiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">到期时间</span>
                    <span className="text-slate-900">{fmt(user.subscriptionExpiresAt, { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                  </div>
                )}
                {user.cancelAtPeriodEnd && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">将在到期后取消</p>
                )}
              </div>

              {/* AI Usage */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI 用量</p>
                {[
                  { label: "AI 聊天", value: user.aiChatUsed },
                  { label: "AI 润色", value: user.aiEnhanceUsed },
                  { label: "AI 写作", value: user.aiComposeUsed },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value} 次</span>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">注册时间</span>
                  <span className="text-slate-900">{fmt(user.createdAt, { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">用户 ID</span>
                  <span className="text-slate-400 text-xs font-mono truncate ml-2">{user.userId.slice(-12)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────
function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "tier" | "name">("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<UserRow | null>(null);

  const load = useCallback(async (p = 1, qv = q, tv = tier) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (qv) params.set("q", qv);
    if (tv) params.set("tier", tv);
    const d = await apiFetch(`/api/admin/users?${params}`);
    setUsers(d.users ?? []); setTotal(d.total ?? 0); setPage(d.page ?? 1); setPages(d.pages ?? 1);
    setLoading(false);
  }, [q, tier]);

  useEffect(() => { load(1, q, tier); }, []);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const sorted = [...users].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortBy === "name") { av = a.name; bv = b.name; }
    else if (sortBy === "tier") { av = ["free", "plus", "pro"].indexOf(a.subscriptionTier); bv = ["free", "plus", "pro"].indexOf(b.subscriptionTier); }
    else { av = a.createdAt; bv = b.createdAt; }
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
  });

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : <Minus className="w-3 h-3 inline ml-0.5 opacity-30" />;

  const handleTierSave = async (userId: string, newTier: string) => {
    await fetch(`${BASE}/api/admin/users/${userId}/tier`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: newTier }),
    });
    setDetail(prev => prev ? { ...prev, subscriptionTier: newTier } : null);
    load(page, q, tier);
  };

  return (
    <div className="space-y-4">
      <UserDetailPanel user={detail} onClose={() => setDetail(null)} onTierSave={handleTierSave} />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1, q, tier)}
            placeholder="搜索姓名 / 邮箱…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={tier} onChange={e => { setTier(e.target.value); load(1, q, e.target.value); }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none">
          <option value="">全部套餐</option>
          <option value="free">免费</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
        </select>
        <button onClick={() => load(1, q, tier)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          搜索
        </button>
      </div>

      <p className="text-xs text-slate-500">共 <span className="font-medium text-slate-900">{total}</span> 个用户</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none"
                  onClick={() => handleSort("name")}>
                  用户 <SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none"
                  onClick={() => handleSort("tier")}>
                  套餐 <SortIcon col="tier" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">AI 用量</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hidden lg:table-cell"
                  onClick={() => handleSort("createdAt")}>
                  注册时间 <SortIcon col="createdAt" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">到期时间</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" /></td></tr>
                ))
                : sorted.map(u => (
                  <tr key={u.userId} onClick={() => setDetail(u)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar
                          ? <img src={u.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">{u.name[0]}</div>
                        }
                        <div>
                          <p className="font-medium text-slate-900 text-sm leading-tight">{u.name}</p>
                          <p className="text-xs text-slate-400 leading-tight">{u.email ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[u.subscriptionTier] ?? "bg-slate-100 text-slate-500"}`}>
                          {TIER_LABEL[u.subscriptionTier] ?? u.subscriptionTier}
                        </span>
                        {u.cancelAtPeriodEnd && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-red-600 bg-red-50">取消中</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-500">聊天 {u.aiChatUsed} · 润色 {u.aiEnhanceUsed}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-600">{fmt(u.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-slate-600">{fmt(u.subscriptionExpiresAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 inline" />
                    </td>
                  </tr>
                ))
              }
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">无匹配用户</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">第 {page} / {pages} 页</p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1, q, tier); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= pages} onClick={() => { setPage(p => p + 1); load(page + 1, q, tier); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Events Page ───────────────────────────────────────────────────────────────
function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1, type = typeFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (type) params.set("type", type);
    const d = await apiFetch(`/api/admin/events?${params}`);
    setEvents(d.events ?? []); setTotal(d.total ?? 0); setPage(d.page ?? 1); setPages(d.pages ?? 1);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); load(1, e.target.value); }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none">
          <option value="">全部事件</option>
          <option value="registered">注册</option>
          <option value="upgraded">付费升级</option>
          <option value="downgraded">降级</option>
          <option value="cancelled">取消订阅</option>
          <option value="resumed">恢复订阅</option>
          <option value="expired">到期降级</option>
        </select>
        <button onClick={() => load(1, typeFilter)}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
        <p className="ml-auto self-center text-xs text-slate-500">共 <span className="font-medium text-slate-900">{total}</span> 条记录</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">用户</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">事件</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">套餐变化</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">金额</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">备注</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" /></td></tr>
                ))
                : events.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ev.userAvatar
                          ? <img src={ev.userAvatar} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          : <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-500 shrink-0">{(ev.userName ?? "?")[0]}</div>
                        }
                        <span className="text-slate-900 font-medium truncate max-w-28">{ev.userName ?? ev.userId.slice(-8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_BADGE[ev.eventType] ?? "bg-slate-100 text-slate-600"}`}>
                        {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {ev.fromTier && ev.toTier && ev.fromTier !== ev.toTier
                        ? <span className="text-xs text-slate-500">{TIER_LABEL[ev.fromTier] ?? ev.fromTier} → {TIER_LABEL[ev.toTier] ?? ev.toTier}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${ev.amountFen > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {fmtYuan(ev.amountFen)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-slate-400 truncate max-w-40 block">{ev.note ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">{fmt(ev.createdAt)}</span>
                    </td>
                  </tr>
                ))
              }
              {!loading && events.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">暂无事件记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">第 {page} / {pages} 页</p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1, typeFilter); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= pages} onClick={() => { setPage(p => p + 1); load(page + 1, typeFilter); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Revenue Page ──────────────────────────────────────────────────────────────
function RevenuePage({ stats, trends }: { stats: Stats; trends: Trends }) {
  const totalRev = trends.revenue.reduce((s, d) => s + d.value, 0);
  const avgDaily = trends.revenue.length > 0 ? Math.round(totalRev / trends.revenue.length) : 0;
  const paidRate = stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : "0";

  const pieData = [
    { name: "免费", value: stats.freeUsers },
    { name: "Plus", value: stats.plusUsers },
    { name: "Pro", value: stats.proUsers },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "30天总收入", value: `¥${(totalRev / 100).toFixed(0)}`, icon: CreditCard, color: "bg-emerald-500" },
          { label: "日均收入", value: `¥${(avgDaily / 100).toFixed(1)}`, icon: TrendingUp, color: "bg-blue-500" },
          { label: "付费用户数", value: stats.paidUsers, icon: Users, color: "bg-violet-500" },
          { label: "付费转化率", value: `${paidRate}%`, icon: ArrowUpRight, color: "bg-amber-500" },
        ].map(c => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} color={c.color} />
        ))}
      </div>

      <TrendChart data={trends.revenue} color="#10b981" label="收入趋势（30天，分）"
        fmt={v => `¥${(v / 100).toFixed(0)}`} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">用户套餐分布</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={TIER_COLORS_PIE[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} 人`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">套餐明细</p>
          <div className="space-y-3">
            {[
              { label: "Pro 探索家", count: stats.proUsers, color: "bg-amber-400", pct: stats.totalUsers > 0 ? (stats.proUsers / stats.totalUsers) * 100 : 0 },
              { label: "Plus 旅记大师", count: stats.plusUsers, color: "bg-blue-400", pct: stats.totalUsers > 0 ? (stats.plusUsers / stats.totalUsers) * 100 : 0 },
              { label: "免费旅行者", count: stats.freeUsers, color: "bg-slate-300", pct: stats.totalUsers > 0 ? (stats.freeUsers / stats.totalUsers) * 100 : 0 },
            ].map(({ label, count, color, pct }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium text-slate-900">{count} <span className="text-slate-400 font-normal text-xs">({pct.toFixed(1)}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.max(pct, 0.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">待取消到期</span>
            <span className="font-medium text-red-600">{stats.cancelPending} 人</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tier Config Page ──────────────────────────────────────────────────────────
const INF_VAL = 999999;
const FIELD_LABELS: Record<string, string> = {
  entries: "日记数量",
  photosPerEntry: "每篇照片",
  aiCompose: "AI 写作/月",
  aiEnhance: "AI 润色/月",
  aiChat: "AI 对话/月",
  styles: "AI写作风格数",
};
const FIELDS = Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[];

type TierRow = {
  tier: string; entries: number; photosPerEntry: number;
  aiCompose: number; aiEnhance: number; aiChat: number; styles: number;
  priceFen: number; originalPriceFen: number;
};

function fmtLimit(v: number) { return v >= INF_VAL ? "∞" : String(v); }
function fenToEditStr(fen: number) { return fen === 0 ? "0" : (fen / 100).toFixed(2).replace(/\.00$/, ""); }

function PriceCell({ fen, readOnly, onSave }: { fen: number; readOnly?: boolean; onSave: (fen: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fenToEditStr(fen));

  const commit = () => {
    const yuan = parseFloat(draft.trim());
    if (!Number.isFinite(yuan) || yuan < 0) { setDraft(fenToEditStr(fen)); setEditing(false); return; }
    onSave(Math.round(yuan * 100));
    setEditing(false);
  };

  if (readOnly) {
    return <span className="px-3 py-1 text-sm font-medium text-slate-400">免费</span>;
  }
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-slate-500 text-sm">¥</span>
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(fenToEditStr(fen)); setEditing(false); } }}
          className="w-20 px-2 py-1 text-sm text-center rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
    );
  }
  return (
    <button onClick={() => { setDraft(fenToEditStr(fen)); setEditing(true); }}
      className="px-3 py-1 text-sm rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-800 min-w-[64px]">
      {fmtYuan(fen)}
    </button>
  );
}

function TierCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fmtLimit(value));

  const commit = () => {
    const v = draft.trim() === "∞" || draft.trim() === "" ? INF_VAL : Number(draft);
    if (!Number.isFinite(v) || v < 0) { setDraft(fmtLimit(value)); setEditing(false); return; }
    onSave(Math.round(v));
    setEditing(false);
  };

  if (editing) {
    return (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(fmtLimit(value)); setEditing(false); } }}
        className="w-20 px-2 py-1 text-sm text-center rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
    );
  }
  return (
    <button onClick={() => { setDraft(fmtLimit(value)); setEditing(true); }}
      className="px-3 py-1 text-sm rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-800 min-w-[56px]">
      {fmtLimit(value)}
    </button>
  );
}

function TiersPage() {
  const [rows, setRows] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/admin/tier-config`, { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (tier: string, field: string, value: number) => {
    setSaving(`${tier}.${field}`);
    setRows(prev => prev.map(r => r.tier === tier ? { ...r, [field]: value } : r));
    await fetch(`${BASE}/api/admin/tier-config/${tier}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(null);
  };

  const TIER_ORDER = ["free", "plus", "pro"];
  const TIER_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
    free:  { label: "免费旅行者", color: "text-slate-600", bg: "bg-slate-50" },
    plus:  { label: "旅记大师 Plus", color: "text-blue-600", bg: "bg-blue-50" },
    pro:   { label: "探索家 Pro", color: "text-amber-600", bg: "bg-amber-50" },
  };

  const sorted = TIER_ORDER.map(t => rows.find(r => r.tier === t)).filter(Boolean) as TierRow[];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <CreditCard className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          点击任意数字即可内联编辑。输入 <code className="bg-blue-100 px-1 rounded">∞</code> 或留空表示无限制。修改后 60 秒内对所有用户生效。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-400 mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">配额项目</th>
                  {sorted.map(r => (
                    <th key={r.tier} className={`px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide w-32 ${TIER_DISPLAY[r.tier]?.color}`}>
                      {TIER_DISPLAY[r.tier]?.label ?? r.tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FIELDS.map(field => (
                  <tr key={field} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-600 font-medium">{FIELD_LABELS[field]}</td>
                    {sorted.map(r => (
                      <td key={r.tier} className="px-5 py-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <TierCell
                            value={(r as any)[field]}
                            onSave={v => handleSave(r.tier, field, v)}
                          />
                          {saving === `${r.tier}.${field}` && (
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Price Config Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">价格配置</span>
          <span className="text-xs text-slate-400 ml-1">（单位：元/月，点击编辑）</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin text-slate-400 mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 w-36">价格项目</th>
                  {sorted.map(r => (
                    <th key={r.tier} className={`px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide w-32 ${TIER_DISPLAY[r.tier]?.color}`}>
                      {TIER_DISPLAY[r.tier]?.label ?? r.tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 font-medium">售价（元）</td>
                  {sorted.map(r => (
                    <td key={r.tier} className="px-5 py-3 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <PriceCell
                          fen={r.priceFen ?? 0}
                          readOnly={r.tier === "free"}
                          onSave={fen => handleSave(r.tier, "priceFen", fen)}
                        />
                        {saving === `${r.tier}.priceFen` && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 font-medium">原价（元）</td>
                  {sorted.map(r => (
                    <td key={r.tier} className="px-5 py-3 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <PriceCell
                          fen={r.originalPriceFen ?? 0}
                          readOnly={r.tier === "free"}
                          onSave={fen => handleSave(r.tier, "originalPriceFen", fen)}
                        />
                        {saving === `${r.tier}.originalPriceFen` && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-400 font-medium text-xs">折扣</td>
                  {sorted.map(r => {
                    if (r.tier === "free") {
                      return <td key={r.tier} className="px-5 py-3 text-center text-slate-400 text-xs">—</td>;
                    }
                    const price = r.priceFen ?? 0;
                    const original = r.originalPriceFen ?? 0;
                    const hasDiscount = original > 0 && price > 0 && original > price;
                    const pct = hasDiscount ? Math.round((price / original) * 10) : null;
                    return (
                      <td key={r.tier} className="px-5 py-3 text-center">
                        {hasDiscount ? (
                          <span className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {pct}折
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">无折扣</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Knowledge Base Page ───────────────────────────────────────────────────────
interface KnowledgeItem {
  id: number; title: string; content: string;
  sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
}
interface ChangelogItem {
  id: number; version: string; title: string; content: string;
  isPublished: boolean; publishedAt: string | null; createdAt: string;
}

function ItemModal({ item, onClose, onSave, isChangelog }: {
  item: Partial<KnowledgeItem & ChangelogItem> | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  isChangelog: boolean;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [version, setVersion] = useState((item as ChangelogItem)?.version ?? "");
  const [sortOrder, setSortOrder] = useState(String((item as KnowledgeItem)?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState((item as KnowledgeItem)?.isActive !== false);
  const [isPublished, setIsPublished] = useState((item as ChangelogItem)?.isPublished ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    if (isChangelog && !version.trim()) return;
    setSaving(true);
    await onSave(isChangelog
      ? { version, title, content, isPublished }
      : { title, content, isActive, sortOrder: Number(sortOrder) || 0 }
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <p className="font-semibold text-slate-900">{item?.id ? "编辑" : "新增"}{isChangelog ? "版本更新" : "知识条目"}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isChangelog && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">版本号</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="如 v1.2.0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          )}
          <div className={isChangelog ? "flex gap-3" : "flex gap-3"}>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="条目标题"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            {!isChangelog && (
              <div className="w-24">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">排序</label>
                <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} min={0} placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
              placeholder={isChangelog ? "描述本次更新的功能点，支持 Markdown" : "功能说明内容，支持 Markdown 格式"}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y font-mono leading-relaxed" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => isChangelog ? setIsPublished(p => !p) : setIsActive(a => !a)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${(isChangelog ? isPublished : isActive) ? "bg-blue-500" : "bg-slate-200"}`}
              style={{ height: "22px" }}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(isChangelog ? isPublished : isActive) ? "translate-x-4.5" : ""}`}
                style={{ transform: (isChangelog ? isPublished : isActive) ? "translateX(18px)" : "translateX(0)" }} />
            </button>
            <span className="text-sm text-slate-600">{isChangelog ? (isPublished ? "已发布（AI 可见）" : "草稿（AI 不可见）") : (isActive ? "启用（AI 可见）" : "停用（AI 不可见）")}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim() || (isChangelog && !version.trim())}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function KnowledgePage() {
  const [tab, setTab] = useState<"manual" | "changelog">("manual");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<KnowledgeItem & ChangelogItem> | null }>({ open: false, item: null });
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const loadKnowledge = async () => {
    setLoading(true);
    const d = await apiFetch("/api/admin/knowledge");
    setKnowledge(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  const loadChangelogs = async () => {
    setLoading(true);
    const d = await apiFetch("/api/admin/changelogs");
    setChangelogs(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { loadKnowledge(); loadChangelogs(); }, []);

  const handleSave = async (data: Record<string, unknown>) => {
    const isChangelog = tab === "changelog";
    const url = isChangelog
      ? (modal.item?.id ? `${BASE}/api/admin/changelogs/${modal.item.id}` : `${BASE}/api/admin/changelogs`)
      : (modal.item?.id ? `${BASE}/api/admin/knowledge/${modal.item.id}` : `${BASE}/api/admin/knowledge`);
    await fetch(url, {
      method: modal.item?.id ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModal({ open: false, item: null });
    if (isChangelog) loadChangelogs(); else loadKnowledge();
  };

  const handleDelete = async (id: number, isChangelog: boolean) => {
    if (!confirm("确认删除？")) return;
    await fetch(`${BASE}/api/admin/${isChangelog ? "changelogs" : "knowledge"}/${id}`, {
      method: "DELETE", credentials: "include",
    });
    if (isChangelog) loadChangelogs(); else loadKnowledge();
  };

  const handleToggle = async (item: KnowledgeItem | ChangelogItem, isChangelog: boolean) => {
    const url = `${BASE}/api/admin/${isChangelog ? "changelogs" : "knowledge"}/${item.id}`;
    const body = isChangelog
      ? { isPublished: !(item as ChangelogItem).isPublished }
      : { isActive: !(item as KnowledgeItem).isActive };
    await fetch(url, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (isChangelog) loadChangelogs(); else loadKnowledge();
  };

  const handleDrop = async (dropIdx: number) => {
    const fromIdx = dragIdx.current;
    if (fromIdx == null || fromIdx === dropIdx) { setDragOverIdx(null); return; }
    const reordered = [...knowledge];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setKnowledge(updated);
    setDragOverIdx(null);
    dragIdx.current = null;
    await Promise.all(
      updated.map(item =>
        fetch(`${BASE}/api/admin/knowledge/${item.id}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: item.sortOrder }),
        })
      )
    );
  };

  const isChangelog = tab === "changelog";
  const items = isChangelog ? changelogs : knowledge;

  return (
    <div className="space-y-4">
      {modal.open && (
        <ItemModal item={modal.item} onClose={() => setModal({ open: false, item: null })}
          onSave={handleSave} isChangelog={isChangelog} />
      )}

      {/* Tabs + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {([["manual", "功能手册", FileText], ["changelog", "版本更新", Brain]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setModal({ open: true, item: null })}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          新增{isChangelog ? "版本" : "条目"}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Brain className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          {isChangelog
            ? "已发布的版本更新会注入 AI 助手的上下文，用户问「最近有什么新功能」时 AI 能准确回答。修改后 60 秒内生效。"
            : "启用的知识条目是 AI 助手的「操作手册」，用户问「怎么用 X 功能」时 AI 会引用这些内容。修改后 60 秒内生效。"}
        </p>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3 mb-2" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center">
            <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">暂无{isChangelog ? "版本更新" : "知识条目"}，点击「新增」添加</p>
          </div>
        )}
        {!loading && (isChangelog ? changelogs : knowledge).map((item, idx) => {
          const active = isChangelog ? (item as ChangelogItem).isPublished : (item as KnowledgeItem).isActive;
          const isDragTarget = !isChangelog && dragOverIdx === idx;
          return (
            <div key={item.id}
              draggable={!isChangelog}
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={e => { if (!isChangelog) { e.preventDefault(); setDragOverIdx(idx); } }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
              className={`bg-white rounded-xl border transition-colors select-none
                ${active ? "border-slate-200" : "border-slate-100 opacity-60"}
                ${isDragTarget ? "border-blue-400 ring-2 ring-blue-200" : ""}
                ${!isChangelog ? "cursor-grab active:cursor-grabbing" : ""}`}>
              <div className="px-4 py-3.5 flex items-start gap-3">
                {!isChangelog && (
                  <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0 hover:text-slate-400" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isChangelog && (
                      <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {(item as ChangelogItem).version}
                      </span>
                    )}
                    {!isChangelog && (
                      <span className="text-xs text-slate-400">#{(item as KnowledgeItem).sortOrder}</span>
                    )}
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${active ? "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200" : "text-slate-500 bg-slate-100"}`}>
                      {active ? (isChangelog ? "已发布" : "启用") : (isChangelog ? "草稿" : "停用")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">{item.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => handleToggle(item, isChangelog)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title={active ? "停用" : "启用"}>
                    {active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  <button onClick={() => setModal({ open: true, item: item as any })}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button onClick={() => handleDelete(item.id, isChangelog)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Engagement Page ───────────────────────────────────────────────────────────
interface EngagementData {
  dau: number; wau: number; mau: number; stickiness: number;
  trend: { day: string; value: number }[];
}

function EngagementPage() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/api/admin/engagement").then(d => { setData(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  const stickinessColor = data.stickiness >= 20 ? "text-emerald-600" : data.stickiness >= 10 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="DAU（今日活跃）" value={data.dau} icon={Zap} color="bg-blue-500" />
        <KpiCard label="WAU（7日活跃）"  value={data.wau} icon={Activity} color="bg-violet-500" />
        <KpiCard label="MAU（30日活跃）" value={data.mau} icon={Users} color="bg-emerald-500" />
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">粘性 DAU/MAU</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className={`text-2xl font-bold mb-1 ${stickinessColor}`}>{data.stickiness}%</p>
          <p className="text-xs text-slate-400">
            {data.stickiness >= 20 ? "健康 ✓（行业均值 ~20%）"
              : data.stickiness >= 10 ? "一般（目标 >20%）"
              : "偏低（目标 >10%）"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">DAU 趋势（近30天）</p>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="g-dau" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(v: number) => [v, "DAU"]} labelFormatter={l => l} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#g-dau)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700">
          活跃用户以「创建旅记」作为活跃信号统计。DAU/MAU 粘性行业基准：社交类 ~25%、工具类 ~10–15%、内容创作类 ~15–20%。
        </p>
      </div>
    </div>
  );
}

// ── MRR Page ──────────────────────────────────────────────────────────────────
interface MrrData {
  currentMrr: number; newMrr: number; churnedCount: number;
  arr: number; arpa: number;
  mrrTrend: { month: string; value: number }[];
}

function MrrPage() {
  const [data, setData] = useState<MrrData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/api/admin/mrr").then(d => { setData(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  const yuan = (fen: number) => `¥${(fen / 100).toFixed(0)}`;
  const yuanDec = (fen: number) => `¥${(fen / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">当前 MRR</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{yuan(data.currentMrr)}</p>
          <p className="text-xs text-slate-400">月经常性收入（活跃付费订阅合计）</p>
        </div>
        <KpiCard label="ARR 年化收入" value={yuan(data.arr)} icon={TrendingUp} color="bg-violet-500" />
        <KpiCard label="本月新增 MRR" value={yuan(data.newMrr)} icon={ArrowUpRight} color="bg-blue-500" />
        <KpiCard label="ARPA 客单价" value={yuanDec(data.arpa)} icon={Users} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* MRR trend chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">月收入趋势（近12个月，新订单归一化到月均）</p>
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
          {data.mrrTrend.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">暂无历史数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.mrrTrend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="g-mrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `¥${(v / 100).toFixed(0)}`} width={48} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v: number) => [yuan(v), "MRR"]} labelFormatter={l => l} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#g-mrr)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Churn + health metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <p className="text-sm font-semibold text-slate-700">本月健康指标</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm text-slate-600">流失事件</p>
                <p className="text-xs text-slate-400">取消 + 到期降级</p>
              </div>
              <span className={`text-xl font-bold ${data.churnedCount > 0 ? "text-red-500" : "text-emerald-600"}`}>
                {data.churnedCount}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm text-slate-600">新增 MRR</p>
                <p className="text-xs text-slate-400">首次付费用户贡献</p>
              </div>
              <span className="text-xl font-bold text-blue-600">{yuan(data.newMrr)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-slate-600">ARPA</p>
                <p className="text-xs text-slate-400">每付费用户平均月收入</p>
              </div>
              <span className="text-xl font-bold text-amber-600">{yuanDec(data.arpa)}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              MRR = 当前活跃付费订阅月均金额合计。年付订单已按月均摊（÷12）。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Moderation Page ───────────────────────────────────────────────────────────
type ModTab = "feedback" | "reports";

interface FeedbackRow {
  id: number; type: string; content: string; resolvedAt: string | null;
  createdAt: string; userId: string | null; userName: string | null;
  userEmail: string | null; userAvatar: string | null;
}
interface ReportRow {
  id: number; targetType: string; targetId: string; reason: string;
  details: string | null; resolvedAt: string | null; createdAt: string;
  reporterId: string; reporterName: string | null; reporterEmail: string | null;
}

const FEEDBACK_TYPE_LABEL: Record<string, string> = {
  bug: "🐛 Bug", feature: "✨ 建议", complaint: "😞 投诉", other: "💬 其他",
};
const FEEDBACK_TYPE_BADGE: Record<string, string> = {
  bug:       "text-red-700 bg-red-50 ring-1 ring-red-200",
  feature:   "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  complaint: "text-orange-700 bg-orange-50 ring-1 ring-orange-200",
  other:     "text-slate-600 bg-slate-100",
};

function ModerationPage() {
  const [tab, setTab] = useState<ModTab>("feedback");
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [reports, setReports]   = useState<ReportRow[]>([]);
  const [fbTotal, setFbTotal]   = useState(0);
  const [rpTotal, setRpTotal]   = useState(0);
  const [fbPage, setFbPage]     = useState(1);
  const [rpPage, setRpPage]     = useState(1);
  const [fbPages, setFbPages]   = useState(1);
  const [rpPages, setRpPages]   = useState(1);
  const [fbType, setFbType]     = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);

  const loadFeedback = useCallback(async (p = fbPage, type = fbType, resolved = showResolved) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), resolved: String(resolved) });
    if (type) params.set("type", type);
    const d = await apiFetch(`/api/admin/feedback?${params}`);
    setFeedback(d.feedback ?? []); setFbTotal(d.total ?? 0);
    setFbPage(d.page ?? 1); setFbPages(d.pages ?? 1);
    setLoading(false);
  }, [fbPage, fbType, showResolved]);

  const loadReports = useCallback(async (p = rpPage, resolved = showResolved) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), resolved: String(resolved) });
    const d = await apiFetch(`/api/admin/reports?${params}`);
    setReports(d.reports ?? []); setRpTotal(d.total ?? 0);
    setRpPage(d.page ?? 1); setRpPages(d.pages ?? 1);
    setLoading(false);
  }, [rpPage, showResolved]);

  useEffect(() => { loadFeedback(1, fbType, showResolved); }, []);
  useEffect(() => { loadReports(1, showResolved); }, []);

  const resolveFeedback = async (id: number, undo: boolean) => {
    setResolving(id);
    await fetch(`${BASE}/api/admin/feedback/${id}/resolve?undo=${undo}`, { method: "PATCH", credentials: "include" });
    setResolving(null);
    loadFeedback(fbPage, fbType, showResolved);
  };

  const resolveReport = async (id: number, undo: boolean) => {
    setResolving(id);
    await fetch(`${BASE}/api/admin/reports/${id}/resolve?undo=${undo}`, { method: "PATCH", credentials: "include" });
    setResolving(null);
    loadReports(rpPage, showResolved);
  };

  const isFb = tab === "feedback";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {([["feedback", "用户反馈", MessageSquare], ["reports", "内容举报", Flag]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
              <span className={`text-[10px] px-1.5 rounded-full font-semibold ml-0.5 ${tab === id ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-400"}`}>
                {id === "feedback" ? fbTotal : rpTotal}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isFb && (
            <select value={fbType} onChange={e => { setFbType(e.target.value); loadFeedback(1, e.target.value, showResolved); }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none">
              <option value="">全部类型</option>
              <option value="bug">Bug</option>
              <option value="feature">功能建议</option>
              <option value="complaint">投诉</option>
              <option value="other">其他</option>
            </select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={showResolved} onChange={e => {
              setShowResolved(e.target.checked);
              if (isFb) loadFeedback(1, fbType, e.target.checked);
              else loadReports(1, e.target.checked);
            }} className="rounded" />
            显示已处理
          </label>
          <button onClick={() => isFb ? loadFeedback(fbPage, fbType, showResolved) : loadReports(rpPage, showResolved)}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Feedback list */}
      {isFb && (
        <div className="space-y-2">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
            </div>
          ))}
          {!loading && feedback.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-12 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{showResolved ? "暂无已处理的反馈" : "暂无待处理反馈"}</p>
            </div>
          )}
          {!loading && feedback.map(fb => (
            <div key={fb.id} className={`bg-white rounded-xl border transition-colors ${fb.resolvedAt ? "border-slate-100 opacity-70" : "border-slate-200"}`}>
              <div className="px-4 py-3.5 flex gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FEEDBACK_TYPE_BADGE[fb.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {FEEDBACK_TYPE_LABEL[fb.type] ?? fb.type}
                    </span>
                    <span className="text-xs text-slate-400">{fmt(fb.createdAt, { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                    {fb.resolvedAt && (
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" />已处理 {fmt(fb.resolvedAt, { month: "2-digit", day: "2-digit" })}
                      </span>
                    )}
                    {fb.userName && (
                      <span className="text-xs text-slate-500 ml-auto">{fb.userName}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{fb.content}</p>
                </div>
                <button
                  disabled={resolving === fb.id}
                  onClick={() => resolveFeedback(fb.id, !!fb.resolvedAt)}
                  title={fb.resolvedAt ? "标为未处理" : "标为已处理"}
                  className={`shrink-0 p-2 rounded-lg transition-colors self-start ${fb.resolvedAt ? "hover:bg-slate-100 text-slate-400" : "hover:bg-emerald-50 text-emerald-500"}`}>
                  {resolving === fb.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}

          {fbPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">第 {fbPage} / {fbPages} 页 · 共 {fbTotal} 条</p>
              <div className="flex items-center gap-1">
                <button disabled={fbPage <= 1} onClick={() => { setFbPage(p => p - 1); loadFeedback(fbPage - 1, fbType, showResolved); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={fbPage >= fbPages} onClick={() => { setFbPage(p => p + 1); loadFeedback(fbPage + 1, fbType, showResolved); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports list */}
      {!isFb && (
        <div className="space-y-2">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
            </div>
          ))}
          {!loading && reports.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-12 text-center">
              <Flag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{showResolved ? "暂无已处理的举报" : "暂无待处理举报"}</p>
            </div>
          )}
          {!loading && reports.map(rp => (
            <div key={rp.id} className={`bg-white rounded-xl border transition-colors ${rp.resolvedAt ? "border-slate-100 opacity-70" : "border-orange-200"}`}>
              <div className="px-4 py-3.5 flex gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium text-orange-700 bg-orange-50 ring-1 ring-orange-200">
                      举报 {rp.targetType === "entry" ? "日记" : rp.targetType === "comment" ? "评论" : "用户"}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#{rp.targetId.slice(0, 12)}</span>
                    <span className="text-xs text-slate-400">{fmt(rp.createdAt, { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                    {rp.resolvedAt && (
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" />已处理 {fmt(rp.resolvedAt, { month: "2-digit", day: "2-digit" })}
                      </span>
                    )}
                    {rp.reporterName && (
                      <span className="text-xs text-slate-500 ml-auto">举报人：{rp.reporterName}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800">原因：{rp.reason}</p>
                  {rp.details && <p className="text-xs text-slate-500 leading-relaxed">{rp.details}</p>}
                </div>
                <button
                  disabled={resolving === rp.id}
                  onClick={() => resolveReport(rp.id, !!rp.resolvedAt)}
                  title={rp.resolvedAt ? "撤销处理" : "标为已处理"}
                  className={`shrink-0 p-2 rounded-lg transition-colors self-start ${rp.resolvedAt ? "hover:bg-slate-100 text-slate-400" : "hover:bg-emerald-50 text-emerald-500"}`}>
                  {resolving === rp.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}

          {rpPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">第 {rpPage} / {rpPages} 页 · 共 {rpTotal} 条</p>
              <div className="flex items-center gap-1">
                <button disabled={rpPage <= 1} onClick={() => { setRpPage(p => p - 1); loadReports(rpPage - 1, showResolved); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={rpPage >= rpPages} onClick={() => { setRpPage(p => p + 1); loadReports(rpPage + 1, showResolved); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState<Page>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trends>({ users: [], revenue: [] });
  const [recentEvents, setRecentEvents] = useState<EventRow[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      setLoading(true);
      const [statsRes, trendsRes, eventsRes] = await Promise.all([
        fetch(`${BASE}/api/admin/stats`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/trends`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/events?page=1`, { credentials: "include" }),
      ]);
      if (statsRes.status === 403) { setForbidden(true); setLoading(false); return; }
      const [s, t, e] = await Promise.all([statsRes.json(), trendsRes.json(), eventsRes.json()]);
      setStats(s); setTrends(t); setRecentEvents(e.events ?? []);
      setLoading(false);
    })();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSignedIn) { setLocation("/sign-in"); return null; }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">🚫</div>
        <p className="font-semibold text-slate-900">无访问权限</p>
        <p className="text-sm text-slate-500">此页面仅限管理员访问</p>
        <button onClick={() => setLocation("/dashboard")}
          className="mt-2 text-sm text-blue-600 hover:underline">← 返回首页</button>
      </div>
    );
  }

  const pageTitle: Record<Page, string> = {
    overview: "概览", users: "用户管理", events: "事件日志", revenue: "收入分析",
    knowledge: "AI 知识库", tiers: "套餐配置",
    engagement: "活跃用户", mrr: "MRR 分析", moderation: "反馈与举报",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar page={page} setPage={setPage} />

      <main className="ml-52 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900">{pageTitle[page]}</h1>
          <button onClick={() => {
            setLoading(true);
            Promise.all([
              fetch(`${BASE}/api/admin/stats`, { credentials: "include" }).then(r => r.json()),
              fetch(`${BASE}/api/admin/trends`, { credentials: "include" }).then(r => r.json()),
            ]).then(([s, t]) => { setStats(s); setTrends(t); setLoading(false); });
          }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        <div className="px-6 py-6">
          {page === "overview" && stats && (
            <OverviewPage stats={stats} trends={trends} events={recentEvents} />
          )}
          {page === "users"      && <UsersPage />}
          {page === "events"     && <EventsPage />}
          {page === "revenue"    && stats && <RevenuePage stats={stats} trends={trends} />}
          {page === "knowledge"  && <KnowledgePage />}
          {page === "tiers"      && <TiersPage />}
          {page === "engagement" && <EngagementPage />}
          {page === "mrr"        && <MrrPage />}
          {page === "moderation" && <ModerationPage />}
        </div>
      </main>
    </div>
  );
}
