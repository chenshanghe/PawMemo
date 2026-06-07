import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Compass, BookText, Globe, Plus, LogOut, Bell, Users, UserCircle2, Map, Images, Navigation, WifiOff, Download, Share2, Smartphone } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { NotifPermissionBanner } from "@/components/notif-permission-banner";
import { InstallBanner } from "@/components/install-banner";
import { SwUpdateBanner } from "@/components/sw-update-banner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SlimProfile {
  name: string;
  bio: string | null;
  avatar: string | null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();

  const [profile, setProfile] = useState<SlimProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`${BASE}/api/me/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setProfile({ name: d.name, bio: d.bio, avatar: d.avatar }); })
      .catch(() => {});
  }, [isSignedIn]);

  // Poll unread notification count every 60s
  useEffect(() => {
    if (!isSignedIn) return;
    const poll = () => {
      fetch(`${BASE}/api/notifications/unread-count`, { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setUnreadCount(d.count ?? 0))
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [isSignedIn]);

  const handleSignOut = () => signOut();

  const isDashboard = location === "/dashboard" || location === "/";
  const isEntries = location.startsWith("/entries") && location !== "/entries/new";
  const isSquare = location === "/square" || location.startsWith("/public/");
  const isFeed = location === "/feed";
  const isMe = location === "/me" || location === "/favorites" || location.startsWith("/users/");
  const isMap = location === "/map";
  const isPhotos = location === "/photos";
  const isPlan = location === "/plan" || location === "/plan/list";
  const isNotifs = location === "/notifications";

  const online = useOnlineStatus();
  const { canInstall, install } = usePWAInstall();


  const displayName = profile?.name || user?.fullName || user?.username || "旅行者";
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const avatar = profile?.avatar || user?.imageUrl || null;
  const bio = profile?.bio ?? null;

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-card/60 px-4 py-8 sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-3 px-2 mb-10">
          <img src={`${BASE}/logo.png`} alt="顽童记" className="w-8 h-8 object-contain shrink-0" />
          <h1 className="font-serif font-bold text-lg text-foreground tracking-wide">顽童记</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isDashboard ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Compass className="w-4.5 h-4.5" />随记
          </Link>
          <Link href="/entries" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isEntries ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <BookText className="w-4.5 h-4.5" />旅记
          </Link>
          <Link href="/map" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isMap ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Map className="w-4.5 h-4.5" />足迹地图
          </Link>
          <Link href="/square" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isSquare ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Globe className="w-4.5 h-4.5" />广场
          </Link>
          <Link href="/feed" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isFeed ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Users className="w-4.5 h-4.5" />动态
          </Link>
          <Link href="/photos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isPhotos ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Images className="w-4.5 h-4.5" />相册
          </Link>
          <Link href="/plan" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isPlan ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <Navigation className="w-4.5 h-4.5" />规划
          </Link>
          <Link href="/me" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isMe ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
            <UserCircle2 className="w-4.5 h-4.5" />我
          </Link>
        </nav>

        <div className="mt-auto space-y-3">
          {/* PWA install prompt */}
          {canInstall && (
            <button
              onClick={install}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 transition-colors font-medium"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>安装到桌面</span>
            </button>
          )}

          <Link href="/entries/new" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95 font-semibold text-sm">
            <Plus className="w-4 h-4" />写随记
          </Link>

          {user && (
            <Link href="/me">
              <div className="group flex flex-col gap-2.5 p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/30 hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 shrink-0 overflow-hidden flex items-center justify-center text-primary font-bold text-sm ring-2 ring-background shadow-sm">
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span>{displayName[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{displayName}</p>
                    {email && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</p>}
                  </div>
                </div>
                {bio && <p className="text-[11px] text-muted-foreground/80 italic leading-snug line-clamp-2 pl-0.5">{bio}</p>}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-muted-foreground/60 group-hover:text-primary/60 transition-colors">查看主页 →</span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSignOut(); }}
                    title="退出登录"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />退出
                  </button>
                </div>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`${BASE}/logo.png`} alt="顽童记" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="font-serif font-bold text-base text-foreground tracking-wide">顽童记</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Sign out — mobile */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 bg-muted/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>退出系统</span>
          </button>
          <Link href="/notifications" className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </Link>
          <button
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={async () => {
              if (canInstall) {
                await install();
              } else if (typeof navigator.share === "function") {
                navigator.share({ title: "顽童日记", text: "用顽童日记记录你的每段旅行故事", url: "https://urchins.life" }).catch(() => {});
              } else {
                await navigator.clipboard.writeText("https://urchins.life").catch(() => {});
              }
            }}
          >
            {canInstall ? <Smartphone className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          </button>
          <Link href="/entries/new" className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col relative">
        {/* Offline banner */}
        {!online && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium py-1.5 px-4">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>当前无网络连接，显示已缓存内容</span>
          </div>
        )}
        {/* Desktop top-right: theme switcher + notification bell */}
        <div className="hidden md:flex pt-5 pb-0 px-8">
          <div className="max-w-5xl mx-auto w-full flex items-center gap-2 justify-end">
            {/* Sign out — desktop */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 bg-muted/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>退出系统</span>
            </button>
            <Link
              href="/notifications"
              className={`relative p-2 rounded-full transition-colors ${isNotifs ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        <SwUpdateBanner />
        <NotifPermissionBanner unreadCount={unreadCount} />
        <InstallBanner />
        <div key={location} className="flex-1 p-4 pb-24 md:px-8 md:pb-8 md:pt-4 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-md z-40 flex items-center justify-around py-2 pb-safe">
        <Link href="/dashboard" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isDashboard ? "text-primary" : "text-muted-foreground"}`}>
          <Compass className="w-5 h-5" /><span className="text-[10px] font-medium">随记</span>
        </Link>
        <Link href="/entries" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isEntries ? "text-primary" : "text-muted-foreground"}`}>
          <BookText className="w-5 h-5" /><span className="text-[10px] font-medium">旅记</span>
        </Link>
        <Link href="/map" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isMap ? "text-primary" : "text-muted-foreground"}`}>
          <Map className="w-5 h-5" /><span className="text-[10px] font-medium">地图</span>
        </Link>
        <Link href="/square" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isSquare ? "text-primary" : "text-muted-foreground"}`}>
          <Globe className="w-5 h-5" /><span className="text-[10px] font-medium">广场</span>
        </Link>
        <Link href="/plan" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isPlan ? "text-primary" : "text-muted-foreground"}`}>
          <Navigation className="w-5 h-5" /><span className="text-[10px] font-medium">规划</span>
        </Link>
        <Link href="/me" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isMe ? "text-primary" : "text-muted-foreground"}`}>
          {user && avatar
            ? <img src={avatar} alt="" className={`w-5 h-5 rounded-full object-cover ${isMe ? "ring-2 ring-primary" : ""}`} />
            : <UserCircle2 className="w-5 h-5" />
          }
          <span className="text-[10px] font-medium">我</span>
        </Link>
      </nav>
    </div>
  );
}
