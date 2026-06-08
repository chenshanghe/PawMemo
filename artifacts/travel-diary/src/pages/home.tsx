import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetStatsSummary, useGetRecentEntries } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Image as ImageIcon, CalendarDays, BookOpen, ChevronRight, Plus, Camera, Map as MapIcon, Send } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

function getHeroText() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，旅途的故事还在继续";
  if (h < 11) return "清晨，准备好迎接新的风景了吗？";
  if (h < 14) return "午后阳光正好，适合记录回忆";
  if (h < 18) return "傍晚的微风，带来远方的思念";
  return "夜幕降临，沉淀今天的感动";
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: recent, isLoading: recentLoading } = useGetRecentEntries();

  const hero = getHeroText();
  const latestEntry = recent?.[0];

  const daysAgo = latestEntry
    ? formatDistanceToNow(new Date(latestEntry.startDate), { locale: zhCN, addSuffix: false })
    : "";

  const travelDays = (entry: typeof latestEntry) => {
    if (!entry) return 1;
    if (!entry.endDate) return 1;
    return Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

        {/* ── Hero ── */}
        <div className="relative pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="max-w-[70%]">
              <h2 className="text-3xl md:text-4xl leading-snug font-serif font-bold text-foreground tracking-wide">
                {hero}
              </h2>
              <p className="mt-3 text-muted-foreground font-serif tracking-widest text-sm uppercase opacity-70">
                Wandering Journal
              </p>
            </div>
            {/* Decorative stamp */}
            <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 border-2 border-primary/20 rounded-full flex flex-col items-center justify-center gap-1 -rotate-12 opacity-50 relative after:content-[''] after:absolute after:inset-1 after:border after:border-primary/20 after:rounded-full after:border-dashed mix-blend-multiply dark:mix-blend-screen">
              <div className="text-[12px] md:text-[14px] font-serif text-primary/80 font-bold tracking-widest">印记</div>
              <div className="text-[9px] md:text-[10px] text-primary/60 tracking-wider">MEMENTO</div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <div className="bg-[#fcfbf9] dark:bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:border-primary/20 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 relative z-10 text-primary group-hover:rotate-12 transition-transform duration-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-muted-foreground font-medium mb-1 tracking-wider">旅记总数</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 bg-muted/60 rounded-md" />
              ) : (
                <p className="text-2xl md:text-3xl font-serif font-black text-foreground leading-none">
                  {stats?.totalEntries ?? 0} <span className="text-sm font-normal text-muted-foreground/70 ml-0.5">篇</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-[#fcfbf9] dark:bg-card rounded-[2rem] p-5 md:p-6 border border-border/40 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:border-primary/20 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 relative z-10 text-primary group-hover:-rotate-12 transition-transform duration-500">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-muted-foreground font-medium mb-1 tracking-wider">珍藏定格</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 bg-muted/60 rounded-md" />
              ) : (
                <p className="text-2xl md:text-3xl font-serif font-black text-foreground leading-none">
                  {stats?.totalPhotos ?? 0} <span className="text-sm font-normal text-muted-foreground/70 ml-0.5">帧</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Latest Entry Preview ── */}
        {!recentLoading && latestEntry && (
          <div className="relative pt-4">
            <Link href={`/entries/${latestEntry.id}`} className="group block">
              <div className="relative bg-card rounded-[2rem] p-5 shadow-sm border border-border/40 hover:border-primary/30 transition-all duration-500 hover:shadow-md overflow-hidden">
                {/* Journal paper texture effect */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay dark:mix-blend-screen" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')" }}></div>
                
                <div className="flex flex-col md:flex-row items-center md:items-stretch gap-5">
                  <div className="w-full md:w-32 h-40 md:h-32 rounded-xl overflow-hidden bg-muted relative shrink-0">
                    {latestEntry.coverImage ? (
                      <img src={latestEntry.coverImage} alt={latestEntry.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/40">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                    {/* Tape piece */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-4 bg-white/40 backdrop-blur-md rotate-2 shadow-sm"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-primary">
                      <Send className="w-3.5 h-3.5" />
                      <p className="text-[11px] font-bold tracking-widest uppercase">Latest Journey</p>
                    </div>
                    <p className="font-serif font-black text-foreground text-2xl md:text-3xl leading-tight truncate mb-2">{latestEntry.destination}</p>
                    <p className="text-sm text-muted-foreground font-medium">{daysAgo}前，在这里留下了足迹</p>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center px-4">
                    <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-300">
                      <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Recent Entries Grid ── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-black text-foreground flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
              翻阅回忆
            </h3>
            <Link href="/entries" className="text-sm text-muted-foreground font-medium flex items-center gap-1 hover:text-primary transition-colors group">
              所有日记 <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[280px] rounded-[2rem] bg-muted/50" />)}
            </div>
          ) : recent?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-[2rem] bg-card/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')] opacity-[0.02]"></div>
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4 relative z-10 text-primary">
                <Camera className="w-8 h-8 opacity-60" />
              </div>
              <h4 className="text-lg font-serif font-bold mb-2 text-foreground relative z-10">空白的扉页</h4>
              <p className="text-sm text-muted-foreground mb-8 relative z-10 max-w-[240px]">带上背包，出发去寻找第一段故事吧。</p>
              <Link
                href="/entries/new"
                className="relative z-10 inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-foreground/90 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                落笔第一篇
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {recent?.map((entry, index) => (
                <Link key={entry.id} href={`/entries/${entry.id}`} className={`group block ${index % 2 !== 0 ? 'md:translate-y-8' : ''}`}>
                  <div className="bg-card rounded-[2rem] overflow-hidden border border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 h-full flex flex-col relative">
                    
                    {/* Date Tag */}
                    <div className="absolute top-5 left-0 bg-background/95 backdrop-blur z-20 py-1.5 px-4 rounded-r-xl border-y border-r border-border/50 shadow-sm flex items-center gap-2">
                      <span className="font-serif font-bold text-foreground">{format(new Date(entry.startDate), 'dd')}</span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{format(new Date(entry.startDate), 'MMM')}</span>
                    </div>

                    {/* Cover */}
                    <div className="relative h-48 overflow-hidden bg-muted/30">
                      {entry.coverImage ? (
                        <img
                          src={entry.coverImage}
                          alt={entry.title}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <MapIcon className="w-12 h-12 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"></div>
                      
                      {/* Location floating */}
                      <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 border border-white/10 shadow-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          {entry.destination}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col relative bg-[#fcfbf9] dark:bg-card">
                      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-border/0 via-border/50 to-border/0"></div>
                      
                      <h4 className="font-serif font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2">
                        {entry.title}
                      </h4>
                      
                      {(entry as any).content && (
                        <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-6 leading-relaxed flex-1">
                          {(entry as any).content}
                        </p>
                      )}
                      
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/40">
                        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                            <CalendarDays className="w-3 h-3 text-primary/70" />
                            {travelDays(entry)} 天
                          </span>
                          {(entry as any).photoCount > 0 && (
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                              <ImageIcon className="w-3 h-3 text-primary/70" />
                              {(entry as any).photoCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-bold tracking-widest text-primary/60 uppercase group-hover:text-primary transition-colors">
                          Read More →
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Action Button (mobile) ── */}
      <Link
        href="/entries/new"
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 flex items-center justify-center bg-foreground text-background rounded-full shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </Layout>
  );
}
