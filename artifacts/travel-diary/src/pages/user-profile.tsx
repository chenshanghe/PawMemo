import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  ChevronLeft, Loader2, Image as ImageIcon, MapPin, Heart, MessageCircle,
  UserPlus, UserCheck, CalendarDays, Bookmark,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UserProfileData {
  userId: string;
  name: string;
  avatar: string | null;
  bio?: string | null;
  entryCount: number;
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
  isSelf: boolean;
}

interface UserEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  mood: string | null;
  coverPhotoUrl: string | null;
  likeCount: number;
  commentCount: number;
  viewerFavorited: boolean;
}

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

export default function UserProfile({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { user, isSignedIn } = useUser();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [entries, setEntries] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [followPending, setFollowPending] = useState(false);

  // If viewing self, redirect-equivalent: just render Me-like header note + link
  const isSelf = isSignedIn && user?.id === userId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`${BASE}/api/users/${userId}`, { credentials: "include" }),
        fetch(`${BASE}/api/users/${userId}/entries?limit=40`, { credentials: "include" }),
      ]);
      if (pRes.ok) setProfile(await pRes.json());
      if (eRes.ok) {
        const d = await eRes.json();
        setEntries(d.entries);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleFollow = async () => {
    if (!isSignedIn || followPending || !profile || profile.isSelf) return;
    setFollowPending(true);
    try {
      const res = await fetch(`${BASE}/api/users/${userId}/follow`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, viewerFollowing: data.following, followerCount: data.followerCount } : prev);
      }
    } finally {
      setFollowPending(false);
    }
  };

  if (loading || !profile) {
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
        {/* Back bar */}
        <div className="sticky top-0 md:top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
          <Link href="/square" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            返回
          </Link>
          <span className="text-sm font-medium text-foreground ml-2 truncate">{profile.name}</span>
        </div>

        {/* Cover */}
        <div className="relative h-44 md:h-56 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-orange-300 to-amber-200" />
          {profile.avatar && (
            <img src={profile.avatar} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        </div>

        <div className="px-4 md:px-8 -mt-12 relative">
          {/* Avatar + follow */}
          <div className="flex items-end justify-between gap-3">
            <div className="w-24 h-24 rounded-full ring-4 ring-background bg-primary/20 overflow-hidden shrink-0 flex items-center justify-center text-3xl font-serif font-bold text-primary shadow-md">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.name[0]
              )}
            </div>

            {isSelf ? (
              <Link
                href="/me"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/60 text-foreground text-xs font-medium border border-border/60 hover:bg-muted transition-colors mt-12"
              >
                编辑主页
              </Link>
            ) : isSignedIn ? (
              <button
                onClick={handleToggleFollow}
                disabled={followPending}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all mt-12 shadow-sm",
                  profile.viewerFollowing
                    ? "bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {followPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : profile.viewerFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {profile.viewerFollowing ? "已关注" : "关注"}
              </button>
            ) : null}
          </div>

          <div className="mt-3">
            <h2 className="text-xl font-serif font-bold text-foreground">{profile.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">旅行号：{profile.userId.slice(-10)}</p>
            {profile.bio && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div>
              <span className="font-serif font-bold text-foreground text-base">{profile.entryCount}</span>
              <span className="text-muted-foreground ml-1">公开日记</span>
            </div>
            <div>
              <span className="font-serif font-bold text-foreground text-base">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">关注</span>
            </div>
            <div>
              <span className="font-serif font-bold text-foreground text-base">{profile.followerCount}</span>
              <span className="text-muted-foreground ml-1">粉丝</span>
            </div>
          </div>

          {/* Notes grid */}
          <div className="mt-6 pb-24 md:pb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">公开日记</h3>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-2xl">✍️</div>
                <p className="text-sm text-muted-foreground">还没有公开的日记</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {entries.map((e) => (
                  <Link key={e.id} href={`/public/${e.id}`}>
                    <div className="rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-md transition-all group cursor-pointer">
                      <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
                        {e.coverPhotoUrl ? (
                          <img src={e.coverPhotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                          </div>
                        )}
                        {e.mood && (
                          <div className={cn("absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium", MOODS[e.mood] ?? "bg-muted text-muted-foreground")}>
                            {e.mood}
                          </div>
                        )}
                        {e.viewerFavorited && (
                          <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-amber-100/90 text-amber-600">
                            <Bookmark className="w-3 h-3 fill-amber-500" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{e.title}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{e.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{e.likeCount}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{e.commentCount}</span>
                          <span className="ml-auto">{format(new Date(e.startDate), "MM.dd")}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
