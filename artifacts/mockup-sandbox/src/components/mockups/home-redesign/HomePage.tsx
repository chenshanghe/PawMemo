import React from "react";
import { BookOpen, ImageIcon, MapPin, Heart } from "lucide-react";

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
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
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

const STATS = [
  { icon: BookOpen, value: 10, label: "我的旅记" },
  { icon: ImageIcon, value: 36, label: "珍藏照片" },
  { icon: MapPin, value: 8, label: "足迹城市" },
  { icon: Heart, value: 128, label: "收获点赞" },
];

const PHOTO_COLORS = [
  "from-teal-300 to-cyan-400",
  "from-pink-300 to-rose-400",
  "from-violet-300 to-purple-400",
  "from-amber-300 to-orange-400",
];

export function HomePage() {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "早安" : hour < 14 ? "午安" : hour < 18 ? "下午好" : "晚安";
  const sunIcon = hour >= 6 && hour < 18 ? "🌤️" : "🌙";

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-5 max-w-[390px] mx-auto space-y-4">

      {/* ── 欢迎 Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-5 shadow-sm">
        <div className="absolute right-0 top-0 bottom-0 w-[140px] opacity-90">
          <MountainSVG />
        </div>
        <div className="relative z-10 max-w-[55%]">
          <p className="text-2xl font-bold text-amber-900 leading-snug">
            {greeting}，顾爷爷 <span className="text-xl">{sunIcon}</span>
          </p>
          <p className="mt-1.5 text-xs text-amber-700">
            今天是 2026年6月8日&nbsp;&nbsp;星期一
          </p>
          <p className="mt-1 text-xs text-amber-600/80">每一天都是新的风景</p>
          <button className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white rounded-full px-5 py-2 text-sm font-semibold shadow-md shadow-orange-200">
            <span className="text-base leading-none">＋</span> 记录今天
          </button>
        </div>
      </div>

      {/* ── 4 格统计 ── */}
      <div className="grid grid-cols-4 gap-2">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-white rounded-xl py-3 px-1 flex flex-col items-center gap-1 shadow-sm">
            <Icon className="w-5 h-5 text-orange-500" strokeWidth={1.8} />
            <span className="font-bold text-lg text-gray-800 leading-none">{value}</span>
            <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* ── 最近回忆 ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-bold text-gray-800 text-base">最近回忆</span>
          <span className="text-sm text-orange-500 cursor-pointer">查看全部 &gt;</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 h-[280px]">
          {/* 左侧大图 */}
          <div className="rounded-2xl bg-gradient-to-br from-teal-300 to-cyan-500 h-full shadow-sm" />
          {/* 右侧 2×2 */}
          <div className="grid grid-rows-2 gap-2.5">
            <div className="rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 shadow-sm" />
            <div className="rounded-2xl bg-gradient-to-br from-violet-300 to-purple-400 shadow-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 h-24 shadow-sm" />
          <div className="rounded-2xl bg-gradient-to-br from-green-300 to-emerald-400 h-24 shadow-sm" />
          <div className="rounded-2xl bg-gradient-to-br from-sky-300 to-blue-400 h-24 shadow-sm" />
        </div>
      </div>

      {/* ── AI 助手 Banner ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="shrink-0">
          <RobotSVG />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-bold text-gray-800 text-sm">AI 叙事助手</span>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-semibold rounded px-1.5 py-0.5 leading-none">新功能</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">帮您整理故事、生成回忆录、制作纪念相册</p>
          <p className="text-[10px] text-gray-400 mt-0.5">让美好记忆永不褪色</p>
        </div>
        <button className="shrink-0 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white rounded-full px-3 py-2 text-xs font-semibold shadow-sm shadow-orange-200 whitespace-nowrap">
          开始叙事
        </button>
      </div>

    </div>
  );
}
