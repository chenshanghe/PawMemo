import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Pencil, Settings, LogOut, Loader2, Bookmark, Users, BookText, Heart,
  MapPin, CalendarDays, Image as ImageIcon, Lock, Globe, EyeOff, X, ChevronRight,
  Camera, Upload, Wand2, Check, Sparkles, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface MyProfile {
  userId: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  entryCount: number;
  publicEntryCount: number;
  followingCount: number;
  followerCount: number;
  likesReceived: number;
  favoritesReceived: number;
}

interface SummaryStats {
  totalEntries: number;
  totalDestinations: number;
  totalPhotos: number;
  totalTravelDays: number;
  longestTripDays: number;
  avgRating: number | null;
  moodCounts: { mood: string; count: number }[];
  topDestinations: { destination: string; count: number }[];
}

interface MonthlyData {
  month: string;
  count: number;
}

interface MyEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  mood: string | null;
  visibility: "private" | "public" | "unlisted";
  coverImage: string | null;
  photoCount: number;
}

interface FavEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  coverPhotoUrl: string | null;
  mood: string | null;
}

interface FollowItem {
  userId: string;
  name: string;
  avatar: string | null;
}

type Tab = "notes" | "favorites" | "following" | "followers" | "stats";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

const VIS_ICON = {
  private: <Lock className="w-3 h-3" />,
  public: <Globe className="w-3 h-3" />,
  unlisted: <EyeOff className="w-3 h-3" />,
};

const PRESET_AVATARS = [
  { url: "https://api.dicebear.com/9.x/adventurer/svg?seed=lychee",      bg: "bg-pink-50" },
  { url: "https://api.dicebear.com/9.x/adventurer/svg?seed=bamboo",      bg: "bg-green-50" },
  { url: "https://api.dicebear.com/9.x/big-smile/svg?seed=journey",      bg: "bg-yellow-50" },
  { url: "https://api.dicebear.com/9.x/big-smile/svg?seed=wanderer",     bg: "bg-orange-50" },
  { url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=traveler",     bg: "bg-blue-50" },
  { url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=explorer",     bg: "bg-purple-50" },
  { url: "https://api.dicebear.com/9.x/micah/svg?seed=nomad",            bg: "bg-teal-50" },
  { url: "https://api.dicebear.com/9.x/micah/svg?seed=pilgrim",          bg: "bg-indigo-50" },
  { url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=globe",        bg: "bg-red-50" },
  { url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=atlas",        bg: "bg-amber-50" },
  { url: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=rover",   bg: "bg-cyan-50" },
  { url: "https://api.dicebear.com/9.x/lorelei/svg?seed=sunset",         bg: "bg-rose-50" },
];

interface SubInfo {
  tier: string;
  tierName: string;
  aiComposedThisMonth: number;
  aiComposeLimit: number;
  aiEnhancedThisMonth: number;
  aiEnhanceLimit: number;
  expiresAt: string | null;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: "免费版", cls: "bg-muted text-muted-foreground" },
  pro:  { label: "Pro",    cls: "bg-primary/15 text-primary" },
  plus: { label: "Plus",   cls: "bg-amber-100 text-amber-700" },
};

export default function Me() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const handleSelectAvatar = async (url: string) => {
    setAvatarSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) {
        const d = await res.json();
        setProfile((prev) => prev ? { ...prev, avatar: d.avatar } : prev);
        setShowAvatarPicker(false);
      }
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setAvatarSaving(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) return;
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await handleSelectAvatar(`/api/storage/objects/${objectPath}`);
    } finally {
      setAvatarSaving(false);
    }
  };

  const [notes, setNotes] = useState<MyEntry[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [favorites, setFavorites] = useState<FavEntry[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [followers, setFollowers] = useState<FollowItem[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const fetchProfile = useCallback(async () => {
    const [pRes, sRes, subRes] = await Promise.all([
      fetch("/api/me/profile", { credentials: "include" }),
      fetch("/api/stats/summary", { credentials: "include" }),
      fetch("/api/me/subscription", { credentials: "include" }),
    ]);
    if (pRes.ok) setProfile(await pRes.json());
    if (sRes.ok) setStats(await sRes.json());
    if (subRes.ok) setSub(await subRes.json());
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Lazy-load tabs
  useEffect(() => {
    if (tab === "notes" && !notesLoaded) {
      fetch("/api/entries", { credentials: "include" }).then(async (r) => {
        if (r.ok) setNotes(await r.json());
        setNotesLoaded(true);
      });
    }
    if (tab === "favorites" && !favoritesLoaded) {
      fetch("/api/me/favorites?limit=40", { credentials: "include" }).then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setFavorites(data.entries);
        }
        setFavoritesLoaded(true);
      });
    }
    if (tab === "following" && !followingLoaded) {
      fetch("/api/me/following", { credentials: "include" }).then(async (r) => {
        if (r.ok) setFollowing(await r.json());
        setFollowingLoaded(true);
      });
    }
    if (tab === "followers" && !followersLoaded) {
      fetch("/api/me/followers", { credentials: "include" }).then(async (r) => {
        if (r.ok) setFollowers(await r.json());
        setFollowersLoaded(true);
      });
    }
    if (tab === "stats" && !statsLoaded) {
      fetch("/api/stats/monthly", { credentials: "include" })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => { setMonthlyData(data); setStatsLoaded(true); })
        .catch(() => setStatsLoaded(true));
    }
  }, [tab, notesLoaded, favoritesLoaded, followingLoaded, followersLoaded, statsLoaded]);

  const handleSignOut = () => signOut();

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="-mt-4 md:-mt-8 -mx-4 md:-mx-8 animate-in fade-in duration-300">
        {/* ── Cover ─────────────────────────────────────────────────────── */}
        <div className="relative h-44 md:h-56 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-orange-300 to-amber-200" />
          {profile.avatar && (
            <img src={profile.avatar} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
          <button
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-sm hover:bg-background transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            编辑主页
          </button>
        </div>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <div className="px-4 md:px-8 -mt-12 relative">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0 group">
              <div className="w-24 h-24 rounded-full ring-4 ring-background bg-primary/20 overflow-hidden flex items-center justify-center text-3xl font-serif font-bold text-primary shadow-md">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.name[0]
                )}
              </div>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-serif font-bold text-foreground">{profile.name}</h2>
              {sub && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_BADGE[sub.tier]?.cls ?? TIER_BADGE.free.cls}`}>
                  {TIER_BADGE[sub.tier]?.label ?? "免费版"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              旅行号：{profile.userId.slice(-10)}
            </p>
            {profile.bio ? (
              <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>
            ) : (
              <button onClick={() => setEditing(true)} className="text-sm text-muted-foreground/70 mt-2 hover:text-primary transition-colors">
                还没有简介，去写一句吧 →
              </button>
            )}
            {/* AI 叙事用量进度 + 套餐管理 */}
            {sub && (
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">✨ AI 叙事本月用量</span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {sub.aiComposedThisMonth} / {sub.aiComposeLimit === 999999 ? "无限" : sub.aiComposeLimit}
                  </span>
                </div>
                {sub.aiComposeLimit < 999999 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (sub.aiComposedThisMonth / sub.aiComposeLimit) * 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">✍️ AI 优化本月用量</span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {sub.aiEnhancedThisMonth} / {sub.aiEnhanceLimit === 999999 ? "无限" : sub.aiEnhanceLimit}
                  </span>
                </div>
                {sub.aiEnhanceLimit < 999999 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.min(100, (sub.aiEnhancedThisMonth / sub.aiEnhanceLimit) * 100)}%` }}
                    />
                  </div>
                )}
                {sub.tier !== "free" && sub.expiresAt && (
                  <p className="text-[10px] text-muted-foreground">
                    套餐到期：{format(new Date(sub.expiresAt), "yyyy 年 M 月 d 日")}
                  </p>
                )}
                <div className="flex items-center justify-between pt-0.5">
                  {sub.tier === "free" ? (
                    <a href="/pricing" className="text-[10px] text-primary hover:underline">升级以获得更多次数 →</a>
                  ) : (
                    <a href="/pricing" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">管理套餐 →</a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats triple */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <Link href="/entries" className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.entryCount}</span>
              <span className="text-muted-foreground ml-1">日记</span>
            </Link>
            <button onClick={() => setTab("following")} className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">关注</span>
            </button>
            <button onClick={() => setTab("followers")} className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.followerCount}</span>
              <span className="text-muted-foreground ml-1">粉丝</span>
            </button>
            <button onClick={() => setTab("favorites")} className="hover:text-primary transition-colors ml-auto">
              <Heart className="w-3.5 h-3.5 inline text-red-400" />
              <span className="font-serif font-bold text-foreground text-base ml-1">{profile.likesReceived + profile.favoritesReceived}</span>
              <span className="text-muted-foreground ml-1 text-xs">获赞与收藏</span>
            </button>
          </div>

          {/* Quick cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-center">
                <div className="text-lg font-serif font-bold text-foreground">{stats.totalDestinations}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">🗺️ 去过的城市</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-center">
                <div className="text-lg font-serif font-bold text-foreground">{stats.totalTravelDays}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">📅 旅行天数</div>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-xl border border-border/50 bg-card/40 p-3 text-center hover:bg-muted/50 transition-colors group"
              >
                <LogOut className="w-4 h-4 mx-auto text-muted-foreground group-hover:text-destructive transition-colors" />
                <div className="text-[10px] text-muted-foreground mt-1">退出登录</div>
              </button>
            </div>
          )}

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <div className="mt-6 border-b border-border/40 flex gap-1 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto">
            {([
              ["notes", "笔记", BookText, profile.entryCount],
              ["favorites", "收藏", Bookmark, null],
              ["following", "关注", Users, profile.followingCount],
              ["followers", "粉丝", Users, profile.followerCount],
              ["stats", "统计", BarChart2, null],
            ] as const).map(([k, label, Icon, count]) => (
              <button
                key={k}
                onClick={() => setTab(k as Tab)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0",
                  tab === k ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== null && count > 0 && <span className="text-[10px] text-muted-foreground/70">({count})</span>}
                {tab === k && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {/* ── Tab content ────────────────────────────────────────────── */}
          <div className="py-5 pb-24 md:pb-6">
            {tab === "notes" && (
              <NotesGrid notes={notes} loaded={notesLoaded} />
            )}
            {tab === "favorites" && (
              <FavoritesGrid favs={favorites} loaded={favoritesLoaded} />
            )}
            {tab === "following" && (
              <UsersList users={following} loaded={followingLoaded} emptyHint="去广场关注感兴趣的旅行者" />
            )}
            {tab === "followers" && (
              <UsersList users={followers} loaded={followersLoaded} emptyHint="还没有粉丝 — 多发几篇公开日记吧" />
            )}
            {tab === "stats" && stats && (
              <StatsTab stats={stats} monthlyData={monthlyData} loaded={statsLoaded} />
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditProfileDialog
          initial={profile}
          onClose={() => setEditing(false)}
          onSaved={(p) => { setProfile((prev) => prev ? { ...prev, name: p.name, bio: p.bio } : prev); setEditing(false); }}
        />
      )}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatar={profile.avatar}
          saving={avatarSaving}
          onSelect={handleSelectAvatar}
          onUpload={handleUploadAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </Layout>
  );
}

const MOOD_COLORS: Record<string, string> = {
  开心: "#fbbf24", 平静: "#60a5fa", 感动: "#f472b6",
  疲惫: "#9ca3af", 兴奋: "#fb923c", 思念: "#a78bfa",
};

function StatsTab({
  stats, monthlyData, loaded,
}: {
  stats: SummaryStats;
  monthlyData: MonthlyData[];
  loaded: boolean;
}) {
  const maxCount = Math.max(...monthlyData.map((d) => d.count), 1);

  const cards = [
    { icon: "📓", value: stats.totalEntries, label: "篇日记" },
    { icon: "📅", value: stats.totalTravelDays, label: "天旅途" },
    { icon: "🗺️", value: stats.totalDestinations, label: "个目的地" },
    { icon: "📷", value: stats.totalPhotos, label: "张照片" },
    ...(stats.longestTripDays > 0 ? [{ icon: "✈️", value: stats.longestTripDays, label: "天最长旅行" }] : []),
    ...(stats.avgRating ? [{ icon: "⭐", value: stats.avgRating.toFixed(1), label: "平均评分" }] : []),
  ];

  if (!loaded) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  }

  return (
    <div className="space-y-8 py-2">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border/40 bg-card/60 p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-serif font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly activity bar chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">📈 最近 12 个月记录频率</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v} 篇`, "日记"]}
                labelFormatter={(l: string) => `${l.slice(0, 4)}年${l.slice(5)}月`}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlyData.map((d) => (
                  <Cell
                    key={d.month}
                    fill={d.count === maxCount ? "#f97316" : "#fed7aa"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top destinations */}
      {stats.topDestinations.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">🏆 最常去的目的地</h3>
          <div className="space-y-3">
            {stats.topDestinations.map((d, i) => (
              <div key={d.destination} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{d.destination}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{d.count} 篇</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(d.count / stats.topDestinations[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood distribution */}
      {stats.moodCounts.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">😊 旅途心情分布</h3>
          <div className="flex flex-wrap gap-2">
            {stats.moodCounts.map((m) => (
              <div
                key={m.mood}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: (MOOD_COLORS[m.mood] ?? "#9ca3af") + "22",
                  color: MOOD_COLORS[m.mood] ?? "#9ca3af",
                  border: `1px solid ${(MOOD_COLORS[m.mood] ?? "#9ca3af")}44`,
                }}
              >
                <span>{m.mood}</span>
                <span className="font-bold">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalEntries === 0 && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <div className="text-4xl">✈️</div>
          <p className="text-sm text-muted-foreground">还没有旅行记录，快去写第一篇日记吧！</p>
          <Link href="/entries/new" className="text-primary text-sm hover:underline">写日记 →</Link>
        </div>
      )}
    </div>
  );
}

function NotesGrid({ notes, loaded }: { notes: MyEntry[]; loaded: boolean }) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (notes.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">📓</div>
      <p className="text-sm text-muted-foreground">还没有写过日记</p>
      <Link href="/entries/new" className="text-primary text-sm hover:underline">写第一篇 →</Link>
    </div>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {notes.map((n) => (
        <Link key={n.id} href={`/entries/${n.id}`}>
          <div className="rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-md transition-all group cursor-pointer">
            <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
              {n.coverImage ? (
                <img src={n.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[10px] text-foreground">
                {VIS_ICON[n.visibility]}
              </div>
              {n.mood && (
                <div className={cn("absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium", MOODS[n.mood] ?? "bg-muted text-muted-foreground")}>
                  {n.mood}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{n.title}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{n.destination}</span>
                <span className="ml-auto">{format(new Date(n.startDate), "MM.dd")}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function FavoritesGrid({ favs, loaded }: { favs: FavEntry[]; loaded: boolean }) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (favs.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">📚</div>
      <p className="text-sm text-muted-foreground">还没有收藏</p>
      <Link href="/square" className="text-primary text-sm hover:underline">去广场看看 →</Link>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {favs.map((f) => (
          <Link key={f.id} href={`/public/${f.id}`}>
            <div className="rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-md transition-all group cursor-pointer">
              <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
                {f.coverPhotoUrl ? (
                  <img src={f.coverPhotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-amber-100/90 text-amber-600">
                  <Bookmark className="w-3 h-3 fill-amber-500" />
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{f.title}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{f.destination}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/favorites" className="block text-center text-xs text-primary hover:underline mt-4">
        查看全部收藏 →
      </Link>
    </>
  );
}

function UsersList({ users, loaded, emptyHint }: { users: FollowItem[]; loaded: boolean; emptyHint: string }) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (users.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">👥</div>
      <p className="text-sm text-muted-foreground">{emptyHint}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {users.map((u) => (
        <Link key={u.userId} href={`/users/${u.userId}`}>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-card/80 transition-colors cursor-pointer">
            <div className="w-11 h-11 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-base font-semibold text-primary">
              {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">旅行者</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function EditProfileDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: MyProfile;
  onClose: () => void;
  onSaved: (p: { name: string; bio: string | null }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio }),
      });
      if (res.ok) {
        const d = await res.json();
        onSaved({ name: d.name, bio: d.bio });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-foreground">编辑主页</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">昵称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">个人简介</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="用一句话介绍你自己..."
              className="mt-1 resize-none"
            />
            <p className="text-[10px] text-muted-foreground/70 text-right mt-1">{bio.length}/120</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AvatarPickerModal({
  currentAvatar,
  saving,
  onSelect,
  onUpload,
  onClose,
}: {
  currentAvatar: string | null;
  saving: boolean;
  onSelect: (url: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"preset" | "upload" | "ai">("preset");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/avatar/ai-suggest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt.trim() }),
      });
      if (res.ok) {
        const { url } = await res.json();
        onSelect(url);
      } else {
        setAiError("生成失败，请重试");
      }
    } catch {
      setAiError("网络错误，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const TABS = [
    { id: "preset" as const, label: "卡通形象", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "upload" as const, label: "上传图片", icon: <Upload className="w-3.5 h-3.5" /> },
    { id: "ai"     as const, label: "AI 生成",  icon: <Wand2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-base font-serif font-bold text-foreground">更换头像</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border/40">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Preset tab */}
        {tab === "preset" && (
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => onSelect(p.url)}
                  disabled={saving}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                    p.bg,
                    currentAvatar === p.url ? "border-primary shadow-md" : "border-transparent hover:border-primary/40"
                  )}
                >
                  <img src={p.url} alt="" className="w-full h-full object-contain p-1" />
                  {currentAvatar === p.url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {saving && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />保存中…
              </div>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="p-5 space-y-4">
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 py-10 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30",
              saving && "pointer-events-none opacity-60"
            )}>
              {saving
                ? <Loader2 className="w-8 h-8 animate-spin text-primary" />
                : <Upload className="w-8 h-8 text-muted-foreground" />
              }
              <span className="text-sm text-muted-foreground">
                {saving ? "上传中…" : "点击选择图片"}
              </span>
              <span className="text-xs text-muted-foreground/60">支持 JPG、PNG、WebP，建议正方形</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
        )}

        {/* AI generate tab */}
        {tab === "ai" && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              描述你的风格或喜好，AI 将为你生成一个专属卡通头像。
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="例如：喜欢旅行的女生、戴眼镜的程序员、可爱的机器人探险家…"
              rows={3}
              className="w-full rounded-xl border border-border/60 bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
            />
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || aiLoading || saving}
              className="w-full gap-2"
            >
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />生成中…</> : <><Wand2 className="w-4 h-4" />AI 生成头像</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
