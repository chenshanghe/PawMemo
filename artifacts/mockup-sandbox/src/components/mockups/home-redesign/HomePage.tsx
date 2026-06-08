import { BookOpen, Camera, MapPin, Heart, Sparkles, Plus } from "lucide-react";

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

const STATS = [
  { label: "我的旅记", value: 10, Icon: BookOpen },
  { label: "珍藏照片", value: 36, Icon: Camera },
  { label: "足迹城市", value: 8, Icon: MapPin },
  { label: "收获点赞", value: 128, Icon: Heart },
];

export function HomePage() {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "早安" : hour < 14 ? "午安" : hour < 18 ? "下午好" : "晚安";

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-4 max-w-[390px] mx-auto flex flex-col gap-4 font-serif">

      {/* 欢迎 Banner */}
      <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-br from-[#fffbf0] via-[#fff3e0] to-[#fde8c8] p-5 shadow-sm">
        <div className="absolute right-0 top-0 bottom-0 w-36 opacity-90">
          <MountainSVG />
        </div>
        <div className="relative z-10 max-w-[55%]">
          <p className="text-[22px] font-black text-amber-900 m-0 leading-tight">
            {greeting}，顾爷爷
          </p>
          <p className="text-xs text-amber-800 mt-2 mb-0">今天是 2026年6月8日&nbsp;&nbsp;星期一</p>
          <p className="text-[11px] text-amber-700 mt-1 mb-0 opacity-80">每一天都是新的风景</p>
          <button className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 text-white border-0 rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer shadow-lg shadow-orange-300/50">
            <Plus size={14} />
            记录今天
          </button>
        </div>
      </div>

      {/* 4 格统计 */}
      <div className="grid grid-cols-4 gap-2.5">
        {STATS.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-2xl py-3 px-1.5 flex flex-col items-center gap-1.5 shadow-sm">
            <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
            <span className="font-extrabold text-xl text-stone-900 leading-none">{value}</span>
            <span className="text-[10px] text-stone-400 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* 最近回忆 */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-extrabold text-stone-900 text-[15px]">最近回忆</span>
          <span className="text-[13px] text-orange-500 cursor-pointer">查看全部 &gt;</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div className="rounded-2xl shadow-sm" style={{ background: "linear-gradient(135deg, #5eead4, #22d3ee)", height: 220 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="rounded-2xl shadow-sm" style={{ background: "linear-gradient(135deg, #f9a8d4, #fb7185)", flex: 1, minHeight: 105 }} />
            <div className="rounded-2xl shadow-sm" style={{ background: "linear-gradient(135deg, #c4b5fd, #a78bfa)", flex: 1, minHeight: 105 }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div className="rounded-xl shadow-sm" style={{ background: "linear-gradient(135deg, #fcd34d, #fb923c)", height: 90 }} />
          <div className="rounded-xl shadow-sm" style={{ background: "linear-gradient(135deg, #6ee7b7, #34d399)", height: 90 }} />
          <div className="rounded-xl shadow-sm" style={{ background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", height: 90 }} />
        </div>
      </div>

      {/* AI 助手 Banner */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
          <Sparkles size={24} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-extrabold text-stone-900 text-[13px]">AI 叙事助手</span>
            <span className="bg-orange-50 text-orange-500 text-[10px] font-bold rounded px-1.5 py-0.5 leading-none">新功能</span>
          </div>
          <p className="text-[11px] text-stone-500 m-0 leading-relaxed">帮您整理故事、生成回忆录、制作纪念相册</p>
          <p className="text-[10px] text-stone-400 mt-0.5 mb-0">让美好记忆永不褪色</p>
        </div>
        <button className="flex-shrink-0 bg-orange-500 text-white border-0 rounded-full px-3.5 py-2 text-xs font-bold cursor-pointer whitespace-nowrap shadow-md shadow-orange-300/40">
          开始叙事
        </button>
      </div>

    </div>
  );
}
