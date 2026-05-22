import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetStatsSummary, useGetDestinationStats, useGetRecentEntries } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Image as ImageIcon, CalendarDays, BookOpen, ChevronRight, Map } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: destinations, isLoading: destLoading } = useGetDestinationStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentEntries();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-serif font-bold text-foreground mb-2">欢迎回来</h2>
          <p className="text-muted-foreground">回忆正在生根发芽。准备好记录下一次冒险了吗？</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="日记总数" value={stats?.totalEntries} icon={BookOpen} loading={statsLoading} />
          <StatCard title="走过城市" value={stats?.totalDestinations} icon={MapPin} loading={statsLoading} />
          <StatCard title="旅行天数" value={stats?.totalTravelDays} icon={CalendarDays} loading={statsLoading} />
          <StatCard title="珍藏照片" value={stats?.totalPhotos} icon={ImageIcon} loading={statsLoading} />
        </div>

        <div className="grid md:grid-cols-3 gap-8 pt-4">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif font-bold text-foreground">最近回忆</h3>
              <Link href="/entries" className="text-sm text-primary hover:underline flex items-center">
                查看全部 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {recentLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl bg-muted/50" />
                ))
              ) : recent?.length === 0 ? (
                <div className="sm:col-span-2 p-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-card/30">
                  <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-foreground mb-1">还没有日记</h4>
                  <p className="text-sm text-muted-foreground mb-4">开始记录你的第一段旅程吧</p>
                  <Link href="/entries/new" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    写新日记
                  </Link>
                </div>
              ) : (
                recent?.map((entry) => (
                  <Link key={entry.id} href={`/entries/${entry.id}`} className="group block">
                    <Card className="h-full overflow-hidden border-border/40 hover:border-primary/30 transition-colors shadow-sm hover:shadow-md bg-card/80 backdrop-blur-sm">
                      <div className="aspect-[4/3] relative overflow-hidden bg-muted/30">
                        {entry.coverImage ? (
                          <img 
                            src={entry.coverImage} 
                            alt={entry.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium text-foreground flex items-center gap-1 shadow-sm">
                          <MapPin className="w-3 h-3 text-primary" />
                          {entry.destination}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">{entry.title}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(new Date(entry.startDate), 'yyyy年MM月dd日')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-foreground">足迹分布</h3>
            <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5">
                {destLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full bg-muted/50" />
                    <Skeleton className="h-8 w-[90%] bg-muted/50" />
                    <Skeleton className="h-8 w-[80%] bg-muted/50" />
                  </div>
                ) : destinations?.length === 0 ? (
                  <div className="text-center py-6">
                    <Map className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">尚未记录目的地</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {destinations?.slice(0, 6).map((dest, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary/80" />
                          <span className="text-sm font-medium">{dest.destination}</span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{dest.count} 篇</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value?: number, icon: any, loading: boolean }) {
  return (
    <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <Skeleton className="h-8 w-16 bg-muted/50" />
        ) : (
          <div className="text-2xl font-bold font-serif">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}