import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Award, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Summary {
  totalEntries: number;
  totalDestinations: number;
  totalPhotos: number;
  totalTravelDays: number;
}

interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  check: (s: Summary) => boolean;
  progress: (s: Summary) => { cur: number; max: number };
}

const BADGES: Badge[] = [
  {
    id: "first_step",
    emoji: "🌱",
    title: "旅行起点",
    desc: "写下你的第一篇日记",
    check: (s) => s.totalEntries >= 1,
    progress: (s) => ({ cur: Math.min(s.totalEntries, 1), max: 1 }),
  },
  {
    id: "explorer_10",
    emoji: "🗺️",
    title: "初级探险家",
    desc: "完成 10 篇旅行日记",
    check: (s) => s.totalEntries >= 10,
    progress: (s) => ({ cur: Math.min(s.totalEntries, 10), max: 10 }),
  },
  {
    id: "explorer_50",
    emoji: "🧭",
    title: "资深旅行者",
    desc: "完成 50 篇旅行日记",
    check: (s) => s.totalEntries >= 50,
    progress: (s) => ({ cur: Math.min(s.totalEntries, 50), max: 50 }),
  },
  {
    id: "centurion",
    emoji: "🏆",
    title: "旅行达人",
    desc: "完成 100 篇旅行日记",
    check: (s) => s.totalEntries >= 100,
    progress: (s) => ({ cur: Math.min(s.totalEntries, 100), max: 100 }),
  },
  {
    id: "city_5",
    emoji: "🏙️",
    title: "城市探索者",
    desc: "到访 5 个不同目的地",
    check: (s) => s.totalDestinations >= 5,
    progress: (s) => ({ cur: Math.min(s.totalDestinations, 5), max: 5 }),
  },
  {
    id: "city_20",
    emoji: "🌍",
    title: "走遍万水千山",
    desc: "到访 20 个不同目的地",
    check: (s) => s.totalDestinations >= 20,
    progress: (s) => ({ cur: Math.min(s.totalDestinations, 20), max: 20 }),
  },
  {
    id: "city_50",
    emoji: "✈️",
    title: "环球旅行家",
    desc: "到访 50 个不同目的地",
    check: (s) => s.totalDestinations >= 50,
    progress: (s) => ({ cur: Math.min(s.totalDestinations, 50), max: 50 }),
  },
  {
    id: "photo_50",
    emoji: "📷",
    title: "记录者",
    desc: "上传 50 张旅行照片",
    check: (s) => s.totalPhotos >= 50,
    progress: (s) => ({ cur: Math.min(s.totalPhotos, 50), max: 50 }),
  },
  {
    id: "photo_200",
    emoji: "📸",
    title: "旅行摄影师",
    desc: "上传 200 张旅行照片",
    check: (s) => s.totalPhotos >= 200,
    progress: (s) => ({ cur: Math.min(s.totalPhotos, 200), max: 200 }),
  },
  {
    id: "photo_1000",
    emoji: "🎞️",
    title: "摄影大师",
    desc: "上传 1000 张旅行照片",
    check: (s) => s.totalPhotos >= 1000,
    progress: (s) => ({ cur: Math.min(s.totalPhotos, 1000), max: 1000 }),
  },
  {
    id: "days_30",
    emoji: "🏕️",
    title: "一个月的流浪",
    desc: "累计旅行天数达 30 天",
    check: (s) => s.totalTravelDays >= 30,
    progress: (s) => ({ cur: Math.min(s.totalTravelDays, 30), max: 30 }),
  },
  {
    id: "days_100",
    emoji: "🌟",
    title: "百日旅人",
    desc: "累计旅行天数达 100 天",
    check: (s) => s.totalTravelDays >= 100,
    progress: (s) => ({ cur: Math.min(s.totalTravelDays, 100), max: 100 }),
  },
  {
    id: "days_365",
    emoji: "🌠",
    title: "永远在路上",
    desc: "累计旅行天数达 365 天",
    check: (s) => s.totalTravelDays >= 365,
    progress: (s) => ({ cur: Math.min(s.totalTravelDays, 365), max: 365 }),
  },
  {
    id: "multi_dest",
    emoji: "🗾",
    title: "多面旅者",
    desc: "到访 10 个不同目的地",
    check: (s) => s.totalDestinations >= 10,
    progress: (s) => ({ cur: Math.min(s.totalDestinations, 10), max: 10 }),
  },
  {
    id: "prolific",
    emoji: "✍️",
    title: "勤劳的旅行作家",
    desc: "完成 20 篇旅行日记",
    check: (s) => s.totalEntries >= 20,
    progress: (s) => ({ cur: Math.min(s.totalEntries, 20), max: 20 }),
  },
];

function BadgeCard({ badge, summary }: { badge: Badge; summary: Summary }) {
  const earned = badge.check(summary);
  const { cur, max } = badge.progress(summary);
  const pct = Math.round((cur / max) * 100);

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${earned
      ? "bg-orange-50 border-orange-200 shadow-sm"
      : "bg-card border-border/40 opacity-60"
    }`}>
      <div className="flex items-start justify-between">
        <span className="text-4xl">{badge.emoji}</span>
        {earned
          ? <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">已解锁</span>
          : <Lock size={16} className="text-muted-foreground mt-1" />
        }
      </div>
      <div>
        <div className="font-semibold text-sm">{badge.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{badge.desc}</div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{cur} / {max}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${earned ? "bg-orange-500" : "bg-orange-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/stats/summary`, { credentials: "include" })
      .then(r => r.json())
      .then(s => { setSummary(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const earned = summary ? BADGES.filter(b => b.check(summary)).length : 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Award size={28} className="text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">旅行成就</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "加载中…" : `已解锁 ${earned} / ${BADGES.length} 个成就`}
            </p>
          </div>
        </div>

        {!loading && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 rounded-2xl p-4">
            {[
              { label: "日记篇数", value: summary.totalEntries },
              { label: "目的地", value: summary.totalDestinations },
              { label: "旅行照片", value: summary.totalPhotos },
              { label: "旅行天数", value: summary.totalTravelDays },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-orange-500">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse h-36" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.sort((a, b) => {
              const ae = a.check(summary) ? 1 : 0;
              const be = b.check(summary) ? 1 : 0;
              return be - ae;
            }).map(badge => (
              <BadgeCard key={badge.id} badge={badge} summary={summary} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16">加载失败，请刷新重试</div>
        )}
      </div>
    </Layout>
  );
}
