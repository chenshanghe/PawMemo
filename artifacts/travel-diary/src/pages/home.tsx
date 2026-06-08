import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetStatsSummary, useGetRecentEntries } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Image as ImageIcon, MapPin, Heart, Plus } from "lucide-react";
import { useUser } from "@clerk/react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function MountainSVG() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="70" cy="108" rx="68" ry="12" fill="#fed7aa" opacity="0.4" />
      <path d="M0 90 Q35 30 70 55 Q105 30 140 90Z" fill="#fb923c" opacity="0.15" />
      <path d="M20 90 Q50 45 80 62 Q110 42 140 90Z" fill="#f97316" opacity="0.2" />
      <path d="M0 90 Q25 55 50 68 Q70 50 90 60 Q115 40 140 90Z" fill="#ea580c" opacity="0.18" />
      <path d="M30 95 Q55 72 80 80 Q105 68 120 95Z" fill="#c2410c" opacity="0.2" />
      <path d="M0 95 Q70 115 140 95 L140 120 L0 120Z" fill="#fde8d0" opacity="0.6" />
      <path d="M0 100 Q70 108 140 100 L140 120 L0 120Z" fill="#fed7aa" opacity="0.5" />
      <path d="M25 42 Q30 35 35 42" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M60 28 Q65 21 70 28" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M90 35 Q95 28 100 35" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  );
}

function RobotSVG() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
      <rect x="10" y="16" width="36" height="28" rx="8" fill="#fed7aa" />
      <rect x="10" y="16" width="36" height="28" rx="8" stroke="#f97316" strokeWidth="1.5" />
      <rect x="20" y="24" width="6" height="6" rx="3" fill="#f97316" />
      <rect x="30" y="24" width="6" height="6" rx="3" fill="#f97316" />
      <path d="M22 35 Q28 39 34 35" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="26" y="8" width="4" height="8" rx="2" fill="#f97316" />
      <circle cx="28" cy="7" r="3" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
      <rect x="4" y="22" width="6" height="10" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
      <rect x="46" y="22" width="6" height="10" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
      <rect x="18" y="44" width="6" height="8" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
      <rect x="32" y="44" width="6" height="8" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
    </svg>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "夜深了";
  if (h < 11) return "早安";
  if (h < 14) return "午安";
  if (h < 18) return "下午好";
  return "晚安";
}

function getSunIcon() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "🌤️" : "🌙";
}

function getTodayStr() {
  const d = new Date();
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日  星期${days[d.getDay()]}`;
}

const FALLBACK_COLORS = [
  "from-teal-300 to-cyan-400",
  "from-pink-300 to-rose-400",
  "from-violet-300 to-purple-400",
  "from-amber-300 to-orange-400",
  "from-green-300 to-emerald-400",
];

export default function Home() {
  const { user } = useUser();
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: recent, isLoading: recentLoading } = useGetRecentEntries();
  const [likesReceived, setLikesReceived] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/me/profile`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.likesReceived != null) setLikesReceived(d.likesReceived); })
      .catch(() => {});
  }, []);

  const displayName = user?.firstName || user?.username || "旅行者";

  const photos = (recent ?? [])
    .filter(e => e.coverImage)
    .map(e => ({ src: e.coverImage!, id: e.id, title: e.title }))
    .slice(0, 5);

  const statItems = [
    { icon: BookOpen, value: stats?.totalEntries ?? 0,      label: "我的旅记" },
    { icon: ImageIcon, value: stats?.totalPhotos ?? 0,      label: "珍藏照片" },
    { icon: MapPin,   value: stats?.totalDestinations ?? 0, label: "足迹城市" },
    { icon: Heart,    value: likesReceived ?? 0,            label: "收获点赞" },
  ];

  return (
    <Layout>
      <div className="space-y-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── 欢迎 Banner ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-5 shadow-sm min-h-[140px]">
          <div className="absolute right-0 top-0 bottom-0 w-[42%] opacity-90 pointer-events-none">
            <MountainSVG />
          </div>
          <div className="relative z-10 max-w-[58%]">
            <p className="text-2xl font-bold text-amber-900 leading-snug">
              {getGreeting()}，{displayName} <span className="text-xl">{getSunIcon()}</span>
            </p>
            <p className="mt-1.5 text-xs text-amber-700">{getTodayStr()}</p>
            <p className="mt-1 text-xs text-amber-600/80">每一天都是新的风景</p>
            <Link href="/entries/new">
              <button className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white rounded-full px-5 py-2 text-sm font-semibold shadow-md shadow-orange-200/60">
                <Plus className="w-4 h-4" /> 记录今天
              </button>
            </Link>
          </div>
        </div>

        {/* ── 4 格统计 ── */}
        <div className="grid grid-cols-4 gap-2">
          {statItems.map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-white dark:bg-card rounded-xl py-3 px-1 flex flex-col items-center gap-1 shadow-sm border border-orange-50 dark:border-border/40">
              <Icon className="w-5 h-5 text-orange-500" strokeWidth={1.8} />
              {statsLoading ? (
                <Skeleton className="h-5 w-8 rounded" />
              ) : (
                <span className="font-bold text-lg text-gray-800 dark:text-foreground leading-none">{value}</span>
              )}
              <span className="text-[10px] text-gray-400 dark:text-muted-foreground text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* ── 最近回忆 ── */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-bold text-gray-800 dark:text-foreground text-base">最近回忆</span>
            <Link href="/entries" className="text-sm text-orange-500 hover:text-orange-600 transition-colors">
              查看全部 &gt;
            </Link>
          </div>

          {recentLoading ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5 h-[240px]">
                <Skeleton className="rounded-2xl h-full" />
                <div className="grid grid-rows-2 gap-2.5">
                  <Skeleton className="rounded-2xl" />
                  <Skeleton className="rounded-2xl" />
                </div>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-orange-100 dark:border-border/40 bg-orange-50/40 dark:bg-muted/20 text-center">
              <ImageIcon className="w-8 h-8 text-orange-200 mb-2" />
              <p className="text-sm text-gray-400 dark:text-muted-foreground">还没有旅行照片</p>
              <p className="text-xs text-gray-300 dark:text-muted-foreground/60 mt-0.5">出发记录第一段旅程吧</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* 主马赛克：左大右双 */}
              <div className="grid grid-cols-2 gap-2.5 h-[240px]">
                <Link href={`/entries/${photos[0].id}`} className="block h-full rounded-2xl overflow-hidden shadow-sm">
                  {photos[0].src ? (
                    <img src={photos[0].src} alt={photos[0].title}
                      className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${FALLBACK_COLORS[0]}`} />
                  )}
                </Link>
                <div className="grid grid-rows-2 gap-2.5">
                  {[1, 2].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden shadow-sm">
                      {photos[i]?.src ? (
                        <Link href={`/entries/${photos[i].id}`}>
                          <img src={photos[i].src} alt={photos[i].title}
                            className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500" />
                        </Link>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${FALLBACK_COLORS[i]}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部三小图（如有更多封面） */}
              {photos.length > 2 && (
                <div className="grid grid-cols-3 gap-2.5">
                  {[2, 3, 4].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden shadow-sm h-24">
                      {photos[i]?.src ? (
                        <Link href={`/entries/${photos[i].id}`}>
                          <img src={photos[i].src} alt={photos[i].title}
                            className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500" />
                        </Link>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${FALLBACK_COLORS[i % 5]} opacity-50`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── AI 叙事助手 ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm border border-orange-50 dark:border-border/40 flex items-center gap-3">
          <div className="shrink-0">
            <RobotSVG />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-gray-800 dark:text-foreground text-sm">AI 叙事助手</span>
              <span className="bg-orange-100 text-orange-600 text-[10px] font-semibold rounded px-1.5 py-0.5 leading-none">新功能</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-muted-foreground leading-relaxed">帮您整理故事、生成回忆录、制作纪念相册</p>
            <p className="text-[10px] text-gray-400 dark:text-muted-foreground/60 mt-0.5">让美好记忆永不褪色</p>
          </div>
          <Link href="/entries/compose">
            <button className="shrink-0 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white rounded-full px-3 py-2 text-xs font-semibold shadow-sm shadow-orange-200/60 whitespace-nowrap">
              开始叙事
            </button>
          </Link>
        </div>

      </div>
    </Layout>
  );
}
