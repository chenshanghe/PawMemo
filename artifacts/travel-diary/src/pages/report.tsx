import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { MapPin, Camera, CalendarDays, Star, TrendingUp, Smile, Tag, Award, BookOpen } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOOD_EMOJI: Record<string, string> = {
  开心: "😄", 平静: "😌", 感动: "🥹", 疲惫: "😴", 兴奋: "🤩", 思念: "💭", 伤感: "😢", 惊喜: "😲",
};
const MOOD_COLOR: Record<string, string> = {
  开心: "#f59e0b", 平静: "#3b82f6", 感动: "#ec4899", 疲惫: "#6b7280",
  兴奋: "#f97316", 思念: "#8b5cf6", 伤感: "#64748b", 惊喜: "#10b981",
};
const BAR_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6", "#ef4444", "#84cc16", "#6366f1", "#fb923c", "#a78bfa"];

interface Summary {
  totalEntries: number;
  totalDestinations: number;
  totalPhotos: number;
  totalTravelDays: number;
  longestTripDays: number;
  avgRating: number | null;
  moodCounts: { mood: string; count: number }[];
  topDestinations: { destination: string; count: number }[];
}
interface MonthData { month: string; count: number }
interface TagData { name: string; count: number }

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
      <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function ReportPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthData[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/stats/summary`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/stats/monthly`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/tags`, { credentials: "include" }).then(r => r.json()),
    ]).then(([s, m, t]) => {
      setSummary(s);
      setMonthly(m);
      setTags(Array.isArray(t) ? t.slice(0, 30) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const thisYearMonths = monthly.filter(m => m.month.startsWith(String(year)));
  const thisYearTotal = thisYearMonths.reduce((s, m) => s + m.count, 0);
  const peakMonth = [...monthly].sort((a, b) => b.count - a.count)[0];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">加载中…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">🍠</div>
          <h1 className="text-2xl font-bold text-foreground">{year} 旅行报告</h1>
          <p className="text-sm text-muted-foreground">你的全部旅行足迹一览</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="旅行日记" value={summary?.totalEntries ?? 0} sub="篇" />
          <StatCard icon={<MapPin className="w-4 h-4" />} label="到访目的地" value={summary?.totalDestinations ?? 0} sub="个" />
          <StatCard icon={<CalendarDays className="w-4 h-4" />} label="累计旅行天数" value={summary?.totalTravelDays ?? 0} sub="天" />
          <StatCard icon={<Camera className="w-4 h-4" />} label="上传照片" value={summary?.totalPhotos ?? 0} sub="张" />
          {summary?.longestTripDays ? (
            <StatCard icon={<Award className="w-4 h-4" />} label="最长单次旅行" value={summary.longestTripDays} sub="天" />
          ) : null}
          {summary?.avgRating ? (
            <StatCard icon={<Star className="w-4 h-4" />} label="平均评分" value={`${summary.avgRating} ★`} sub="满分 5 分" />
          ) : null}
          {thisYearTotal > 0 && (
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label={`${year} 年写了`} value={thisYearTotal} sub="篇日记" />
          )}
        </div>

        {/* Monthly bar chart */}
        {monthly.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">近 12 个月发布趋势</span>
            </div>
            {peakMonth && peakMonth.count > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                最活跃月份：{peakMonth.month.replace("-", " 年 ").replace(/^(\d+ 年 )0?(\d+)$/, "$1$2")} 月，共 {peakMonth.count} 篇
              </p>
            )}
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthly} barSize={16}>
                <XAxis dataKey="month" tickFormatter={v => v.slice(5)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [`${v} 篇`, "日记"]}
                  labelFormatter={l => `${l.replace("-", " 年 ")} 月`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {monthly.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top destinations */}
        {summary?.topDestinations && summary.topDestinations.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">最常去的地方 Top 5</span>
            </div>
            <div className="space-y-2.5">
              {summary.topDestinations.map((d, i) => {
                const max = summary.topDestinations[0].count;
                return (
                  <div key={d.destination} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right font-mono">{i + 1}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{d.destination}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(d.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{d.count} 篇</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mood breakdown */}
        {summary?.moodCounts && summary.moodCounts.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Smile className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">旅行心情</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.moodCounts.map(({ mood, count }) => (
                <div
                  key={mood}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${MOOD_COLOR[mood] ?? "#6b7280"}18`,
                    borderColor: `${MOOD_COLOR[mood] ?? "#6b7280"}40`,
                    color: MOOD_COLOR[mood] ?? "#6b7280",
                  }}
                >
                  <span>{MOOD_EMOJI[mood] ?? "🙂"}</span>
                  <span>{mood}</span>
                  <span className="opacity-60">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags cloud */}
        {tags.length > 0 && (
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">我的旅行标签</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span
                  key={tag.name}
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${BAR_COLORS[i % BAR_COLORS.length]}18`,
                    borderColor: `${BAR_COLORS[i % BAR_COLORS.length]}40`,
                    color: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!summary?.totalEntries && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            还没有旅行日记，快去写第一篇吧～
          </div>
        )}
      </div>
    </Layout>
  );
}
