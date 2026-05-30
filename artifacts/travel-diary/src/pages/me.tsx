import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Pencil, Settings, LogOut, Loader2, Bookmark, Users, BookText, Heart,
  MapPin, CalendarDays, Image as ImageIcon, Lock, Globe, EyeOff, X, ChevronRight,
} from "lucide-react";
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

type Tab = "notes" | "favorites" | "following" | "followers";

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

interface SubInfo {
  tier: string;
  tierName: string;
  aiComposedThisMonth: number;
  aiComposeLimit: number;
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

  const [notes, setNotes] = useState<MyEntry[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [favorites, setFavorites] = useState<FavEntry[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [followers, setFollowers] = useState<FollowItem[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);

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
  }, [tab, notesLoaded, favoritesLoaded, followingLoaded, followersLoaded]);

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
            <div className="w-24 h-24 rounded-full ring-4 ring-background bg-primary/20 overflow-hidden shrink-0 flex items-center justify-center text-3xl font-serif font-bold text-primary shadow-md">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.name[0]
              )}
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
            {/* AI 叙事用量进度 */}
            {sub && (
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/30">
                <div className="flex items-center justify-between mb-1.5">
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
                {sub.tier === "free" && (
                  <a href="/pricing" className="block text-[10px] text-primary mt-1.5 hover:underline">升级以获得更多次数 →</a>
                )}
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
    </Layout>
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
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
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            头像跟随登录账号，如需更换请到账户设置。
          </p>
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
