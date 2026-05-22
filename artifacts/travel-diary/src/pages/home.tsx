import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetStatsSummary, useGetRecentEntries } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Image as ImageIcon, CalendarDays, BookOpen, ChevronRight, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

function getHeroText() {
  const h = new Date().getHours();
  if (h < 6) return { line1: "深夜的星光", line2: "为旅人指路" };
  if (h < 11) return { line1: "清晨的旅途", line2: "正待出发" };
  if (h < 14) return { line1: "午后的风景", line2: "值得被记录" };
  if (h < 18) return { line1: "傍晚的回忆", line2: "正在沉淀" };
  return { line1: "今晚的回忆", line2: "正在发酵" };
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: recent, isLoading: recentLoading } = useGetRecentEntries();

  const hero = getHeroText();
  const latestEntry = recent?.[0];
  const otherEntries = recent?.slice(1) ?? [];

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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Hero ── */}
        <div className="relative pt-2 pb-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[2rem] leading-tight font-serif font-bold text-foreground">
                {hero.line1}<br />{hero.line2}
              </h2>
            </div>
            {/* Decorative stamp */}
            <div className="shrink-0 mt-1 mr-1 w-16 h-16 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center gap-0.5 rotate-3 opacity-60">
              <div className="text-[10px] font-serif text-primary/70 font-bold tracking-widest">记忆</div>
              <div className="text-[8px] text-muted-foreground tracking-wider">纪念邮票</div>
            </div>
          </div>
        </div>

        {/* ── Latest Entry Preview ── */}
        {recentLoading ? (
          <Skeleton className="h-20 rounded-2xl bg-muted/50" />
        ) : latestEntry ? (
          <Link href={`/entries/${latestEntry.id}`}>
            <div className="flex items-center gap-4 bg-card rounded-2xl p-4 shadow-sm border border-border/40 hover:border-primary/30 transition-colors">
              <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted/50">
                {latestEntry.coverImage ? (
                  <img src={latestEntry.coverImage} alt={latestEntry.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium mb-0.5">最近一次记录</p>
                <p className="font-serif font-bold text-foreground text-base leading-tight truncate">{latestEntry.destination}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{daysAgo}前</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ) : null}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">日记总数</p>
              {statsLoading ? (
                <Skeleton className="h-6 w-8 mt-0.5 bg-muted/60" />
              ) : (
                <p className="text-xl font-serif font-bold text-foreground leading-tight">
                  {stats?.totalEntries ?? 0} <span className="text-sm font-normal text-muted-foreground">篇</span>
                </p>
              )}
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">收藏照片</p>
              {statsLoading ? (
                <Skeleton className="h-6 w-8 mt-0.5 bg-muted/60" />
              ) : (
                <p className="text-xl font-serif font-bold text-foreground leading-tight">
                  {stats?.totalPhotos ?? 0} <span className="text-sm font-normal text-muted-foreground">张</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Entries ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-bold text-foreground">最近日记</h3>
            <Link href="/entries" className="text-sm text-primary font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity">
              查看全部 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl bg-muted/50" />)}
            </div>
          ) : recent?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/40">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h4 className="text-base font-serif font-bold mb-1 text-foreground">还没有日记</h4>
              <p className="text-sm text-muted-foreground mb-5">开始记录你的第一段旅程吧</p>
              <Link
                href="/entries/new"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                写新日记
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recent?.map((entry) => (
                <Link key={entry.id} href={`/entries/${entry.id}`} className="group block">
                  <div className="bg-card rounded-2xl overflow-hidden border border-border/40 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-300">
                    {/* Cover */}
                    <div className="relative aspect-[2/1] overflow-hidden bg-muted/40">
                      {entry.coverImage ? (
                        <img
                          src={entry.coverImage}
                          alt={entry.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Location chip */}
                      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                        <MapPin className="w-3 h-3 text-primary" />
                        {entry.destination}
                      </div>
                      {/* Date chip */}
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-muted-foreground shadow-sm">
                        {format(new Date(entry.startDate), 'MM.dd')}
                        {entry.endDate && ` — ${format(new Date(entry.endDate), 'MM.dd')}`}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h4 className="font-serif font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors mb-1.5 line-clamp-1">
                        {entry.title}
                      </h4>
                      {(entry as any).content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                          "{(entry as any).content.slice(0, 80)}{(entry as any).content.length > 80 ? '…"' : '"'}"
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {travelDays(entry)} 天旅程
                          </span>
                          {(entry as any).photoCount > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              {(entry as any).photoCount} 张照片
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/entries/${entry.id}/edit`}
                          className="text-xs text-primary font-medium flex items-center gap-0.5 hover:opacity-75 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          继续编辑 <ChevronRight className="w-3 h-3" />
                        </Link>
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
        className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg shadow-primary/30 font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all z-30 whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        记录此刻
      </Link>
    </Layout>
  );
}
