function MountainSVG() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
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
  { label: "我的旅记", value: 10, path: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" },
  { label: "珍藏照片", value: 36, path: "M21 15V6M3 15V6m0 0h18M3 6l9-4 9 4M21 21H3m18 0v-6M3 21v-6" },
  { label: "足迹城市", value: 8, path: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" },
  { label: "收获点赞", value: 128, path: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
];

export function HomePage() {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "早安" : hour < 14 ? "午安" : hour < 18 ? "下午好" : "晚安";
  const sunIcon = hour >= 6 && hour < 18 ? "🌤️" : "🌙";

  const P = "#f97316";
  const BG = "#faf8f5";

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "20px 16px", maxWidth: 390, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Noto Serif SC', Georgia, serif", boxSizing: "border-box" }}>

      {/* ── 欢迎 Banner ── */}
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "linear-gradient(135deg, #fffbf0, #fff3e0, #fde8c8)", padding: "20px 20px 20px 20px", boxShadow: "0 2px 12px rgba(249,115,22,0.10)" }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, opacity: 0.9 }}>
          <MountainSVG />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: "55%" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#78350f", margin: 0, lineHeight: 1.3 }}>
            {greeting}，顾爷爷 <span style={{ fontSize: 18 }}>{sunIcon}</span>
          </p>
          <p style={{ fontSize: 12, color: "#92400e", margin: "8px 0 0" }}>今天是 2026年6月8日&nbsp;&nbsp;星期一</p>
          <p style={{ fontSize: 11, color: "#b45309", margin: "4px 0 0", opacity: 0.8 }}>每一天都是新的风景</p>
          <button style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, background: P, color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
            ＋ 记录今天
          </button>
        </div>
      </div>

      {/* ── 4 格统计 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {STATS.map(({ label, value, path }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={path} />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 20, color: "#1c1917", lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, color: "#a8a29e", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 最近回忆 ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, color: "#1c1917", fontSize: 15 }}>最近回忆</span>
          <span style={{ fontSize: 13, color: P, cursor: "pointer" }}>查看全部 &gt;</span>
        </div>
        {/* 上：左大 + 右2小 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, height: 220, marginBottom: 10 }}>
          <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #5eead4, #22d3ee)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 10 }}>
            <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #f9a8d4, #fb7185)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
            <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #c4b5fd, #a78bfa)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
          </div>
        </div>
        {/* 下：3 格 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={{ borderRadius: 14, background: "linear-gradient(135deg, #fcd34d, #fb923c)", height: 90, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
          <div style={{ borderRadius: 14, background: "linear-gradient(135deg, #6ee7b7, #34d399)", height: 90, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
          <div style={{ borderRadius: 14, background: "linear-gradient(135deg, #7dd3fc, #38bdf8)", height: 90, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
        </div>
      </div>

      {/* ── AI 助手 Banner ── */}
      <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <RobotSVG />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, color: "#1c1917", fontSize: 13 }}>AI 叙事助手</span>
            <span style={{ background: "#fff7ed", color: P, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 6px", lineHeight: 1 }}>新功能</span>
          </div>
          <p style={{ fontSize: 11, color: "#78716c", margin: 0, lineHeight: 1.6 }}>帮您整理故事、生成回忆录、制作纪念相册</p>
          <p style={{ fontSize: 10, color: "#a8a29e", margin: "3px 0 0" }}>让美好记忆永不褪色</p>
        </div>
        <button style={{ flexShrink: 0, background: P, color: "#fff", border: "none", borderRadius: 999, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(249,115,22,0.3)" }}>
          开始叙事
        </button>
      </div>

    </div>
  );
}
