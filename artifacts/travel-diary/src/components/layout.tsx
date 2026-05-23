import React from "react";
import { Link, useLocation } from "wouter";
import { Compass, BookText, Globe, Plus, LogOut, User, Bell, Users, UserCircle2 } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = () => signOut({ redirectUrl: basePath || "/" });

  const isDashboard = location === "/dashboard" || location === "/";
  const isEntries = location.startsWith("/entries") && location !== "/entries/new";
  const isSquare = location === "/square" || location.startsWith("/public/");
  const isFeed = location === "/feed";
  const isMe = location === "/me" || location === "/favorites" || location.startsWith("/users/");

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-card/60 px-4 py-8 sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-lg font-bold shadow-sm">
            薯
          </div>
          <h1 className="font-serif font-bold text-lg text-foreground tracking-wide">红薯旅行日记</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isDashboard
                ? "bg-primary/12 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Compass className="w-4.5 h-4.5" />
            随记
          </Link>
          <Link
            href="/entries"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isEntries
                ? "bg-primary/12 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <BookText className="w-4.5 h-4.5" />
            旅记
          </Link>
          <Link
            href="/square"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isSquare
                ? "bg-primary/12 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Globe className="w-4.5 h-4.5" />
            广场
          </Link>
          <Link
            href="/feed"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isFeed
                ? "bg-primary/12 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            动态
          </Link>
          <Link
            href="/me"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isMe
                ? "bg-primary/12 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <UserCircle2 className="w-4.5 h-4.5" />
            我
          </Link>
        </nav>

        <div className="mt-auto space-y-3">
          <Link
            href="/entries/new"
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            写新日记
          </Link>

          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0]}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="退出登录"
                className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-sm font-bold shadow-sm">
            薯
          </div>
          <h1 className="font-serif font-bold text-base text-foreground tracking-wide">红薯旅行日记</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Bell className="w-4.5 h-4.5" />
          </button>
          <Link href="/entries/new" className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 p-4 pb-24 md:p-8 md:pb-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-md z-40 flex items-center justify-around py-2 pb-safe">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${
            isDashboard ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium">随记</span>
        </Link>
        <Link
          href="/entries"
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
            isEntries ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <BookText className="w-5 h-5" />
          <span className="text-[10px] font-medium">旅记</span>
        </Link>
        <Link
          href="/square"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            isSquare ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Globe className="w-5 h-5" />
          <span className="text-[10px] font-medium">广场</span>
        </Link>
        <Link
          href="/feed"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            isFeed ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">动态</span>
        </Link>
        <Link
          href="/me"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            isMe ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <UserCircle2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">我</span>
        </Link>
      </nav>
    </div>
  );
}
