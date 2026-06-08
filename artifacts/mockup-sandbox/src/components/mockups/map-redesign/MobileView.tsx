export function MobileView() {
  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";
  const SEA = "#D4E8F0";
  const LAND = "#E8E0D5";
  const LAND_STROKE = "#C4B49F";

  const destinations = [
    { id: 1, title: "遇见大理，遇见自己", place: "云南大理", date: "2025.05.12", days: 5, color: "#C9A87C" },
    { id: 2, title: "西湖烟雨，诗意江南", place: "浙江杭州", date: "2025.04.28", days: 3, color: "#7C9CA8" },
    { id: 3, title: "青城幽径，问道之旅", place: "四川成都", date: "2025.03.15", days: 7, color: "#7CA87C" },
    { id: 4, title: "厦门海风，慢时光", place: "福建厦门", date: "2025.02.08", days: 4, color: "#A87C9C" },
  ];

  const stats = [
    { label: "个目的地", value: "12", icon: "📍" },
    { label: "天旅途", value: "47", icon: "🗓" },
    { label: "篇日记", value: "8", icon: "📖" },
  ];

  const markers = [
    { cx: 118, cy: 148, label: "大理" },
    { cx: 218, cy: 128, label: "杭州" },
    { cx: 148, cy: 130, label: "成都" },
    { cx: 228, cy: 138, label: "厦门" },
    { cx: 230, cy: 108, label: "北京", size: 5 },
    { cx: 248, cy: 118, label: "上海", size: 5 },
  ];

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(245,240,232,0.94)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BOR}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: FG, fontFamily: "Georgia, serif" }}>足迹地图</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 1 }}>12 个目的地 · 走过 8 个省份</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, background: `${P}15`, border: `1px solid ${P}30`, fontSize: 12, fontWeight: 700, color: P }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            散点
          </button>
        </div>
      </header>

      {/* Stats chips */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ flexShrink: 0, background: CARD, border: `1px solid ${BOR}`, borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: FG, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ margin: "0 16px", borderRadius: 18, overflow: "hidden", border: `1px solid ${BOR}`, boxShadow: "0 4px 20px rgba(42,26,10,0.10)", position: "relative" }}>
        <svg viewBox="80 80 240 130" width="100%" style={{ display: "block", background: SEA }}>
          {/* Simplified China outline */}
          <path d="M120,90 L160,85 L200,88 L240,95 L280,100 L300,115 L295,130 L270,145 L250,155 L230,152 L210,160 L190,165 L170,160 L150,155 L130,150 L110,140 L105,125 L110,110 Z" fill={LAND} stroke={LAND_STROKE} strokeWidth="1"/>
          <path d="M200,88 L220,82 L240,85 L260,90 L270,100 L265,110 L255,115 L240,112 L220,108 L205,100 Z" fill={LAND} stroke={LAND_STROKE} strokeWidth="0.8"/>
          {/* Sea areas */}
          <rect x="220" y="130" width="80" height="70" rx="4" fill={SEA} />
          {/* Island dots */}
          <ellipse cx="248" cy="175" rx="8" ry="5" fill={`${LAND}cc`} stroke={LAND_STROKE} strokeWidth="0.6"/>
          <ellipse cx="270" cy="160" rx="5" ry="3" fill={`${LAND}cc`} stroke={LAND_STROKE} strokeWidth="0.6"/>
          {/* Markers */}
          {markers.map((m, i) => (
            <g key={i}>
              <circle cx={m.cx} cy={m.cy} r={m.size ?? 7} fill={P} stroke="white" strokeWidth="2" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}/>
              {!m.size && <circle cx={m.cx} cy={m.cy} r={3} fill="white"/>}
            </g>
          ))}
          {/* Zoom controls */}
        </svg>
        {/* Zoom controls overlay */}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {["+", "−", "⊡"].map((s, i) => (
            <div key={i} style={{ width: 28, height: 28, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", borderRadius: 8, border: `1px solid ${BOR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i === 2 ? 11 : 14, fontWeight: 700, color: FG, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              {s}
            </div>
          ))}
        </div>
        {/* View toggle inside map bottom-left */}
        <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", border: `1px solid ${BOR}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "white", background: P }}>散点</div>
          <div style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, color: MUT }}>路线</div>
        </div>
      </div>

      {/* Recent destinations */}
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: FG }}>最近足迹</span>
          <span style={{ fontSize: 11, color: P, fontWeight: 700 }}>全部 →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {destinations.map((d) => (
            <div key={d.id} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(42,26,10,0.05)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${d.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={d.color} strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
                <div style={{ fontSize: 11, color: MUT, marginTop: 1 }}>{d.place} · {d.date} · {d.days}天</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ height: 80 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 390, background: "rgba(245,240,232,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${BOR}`, padding: "8px 0 20px", display: "flex", justifyContent: "space-around" }}>
        {[
          { label: "随记", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: "旅记", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> },
          { label: "地图", active: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg> },
          { label: "广场", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> },
          { label: "我", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 56 }}>
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 500, color: item.active ? P : MUT }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
