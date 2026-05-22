import React from "react";
import { Link, useLocation } from "wouter";
import { Compass, BookText, Plus, LogOut, User } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = () => signOut({ redirectUrl: basePath || "/" });

  const isDashboard = location === "/dashboard" || location === "/";
  const isEntries = location.startsWith("/entries") && location !== "/entries/new";

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-card/50 px-4 py-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-xl font-bold">
            薯
          </div>
          <h1 className="font-serif font-bold text-xl text-foreground tracking-wide">
            红薯旅行日记
          </h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isDashboard ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
            <Compass className="w-5 h-5" />
            仪表盘
          </Link>
          <Link href="/entries" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isEntries ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
            <BookText className="w-5 h-5" />
            所有日记
          </Link>
        </nav>

        <div className="mt-auto space-y-3">
          <Link href="/entries/new" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-md shadow-sm transition-transform hover:scale-[1.02] active:scale-95 font-medium">
            <Plus className="w-4 h-4" />
            写新日记
          </Link>

          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/30">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0]}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="退出登录"
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-sm font-bold">
            薯
          </div>
          <h1 className="font-serif font-bold text-lg text-foreground tracking-wide">
            红薯旅行日记
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/entries/new" className="bg-primary/10 text-primary p-2 rounded-full">
            <Plus className="w-5 h-5" />
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-md z-40 flex items-center justify-around py-3 px-6 pb-safe">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${isDashboard ? "text-primary" : "text-muted-foreground"}`}>
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium">首页</span>
        </Link>
        <Link href="/entries" className={`flex flex-col items-center gap-1 ${isEntries ? "text-primary" : "text-muted-foreground"}`}>
          <BookText className="w-5 h-5" />
          <span className="text-[10px] font-medium">日记</span>
        </Link>
      </nav>
    </div>
  );
}
