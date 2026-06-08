export function DesktopView() {
  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";
  const SIDEBAR = "#F0EBE0";
  const SEA = "#D4E8F0";
  const LAND = "#E8E0D5";
  const LAND_STROKE = "#C4B49F";

  const destinations = [
    { id: 1, title: "遇见大理，遇见自己", place: "云南大理", date: "2025.05.12", days: 5, color: "#C9A87C", mood: "开心" },
    { id: 2, title: "西湖烟雨，诗意江南", place: "浙江杭州", date: "2025.04.28", days: 3, color: "#7C9CA8", mood: "平静" },
    { id: 3, title: "青城幽径，问道之旅", place: "四川成都", date: "2025.03.15", days: 7, color: "#7CA87C", mood: "感动" },
    { id: 4, title: "厦门海风，慢时光", place: "福建厦门", date: "2025.02.08", days: 4, color: "#A87C9C", mood: "兴奋" },
  ];

  const moodColors: Record<string, { bg: string; text: string }> = {
    开心: { bg: "#FEF9C3", text: "#854D0E" },
    平静: { bg: "#DBEAFE", text: "#1E40AF" },
    感动: { bg: "#FCE7F3", text: "#9D174D" },
    兴奋: { bg: "#FFEDD5", text: "#9A3412" },
  };

  const stats = [
    { label: "个目的地", value: "12", sub: "标记地点" },
    { label: "天旅途", value: "47", sub: "累计行程" },
    { label: "个省份", value: "8", sub: "走过足迹" },
  ];

  const markers = [
    { cx: 310, cy: 200, label: "大理", r: 9 },
    { cx: 470, cy: 175, label: "杭州", r: 9 },
    { cx: 360, cy: 180, label: "成都", r: 9 },
    { cx: 490, cy: 195, label: "厦门", r: 7 },
    { cx: 480, cy: 148, label: "北京", r: 6 },
    { cx: 500, cy: 168, label: "上海", r: 6 },
    { cx: 420, cy: 210, label: "贵阳", r: 5 },
  ];

  const sidebarItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "随记" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, label: "旅记" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>, label: "地图", active: true },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>, label: "广场" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>, label: "规划" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "我" },
  ];

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", display: "flex" }}>

      {/* Sidebar */}
      <aside style={{ width: 220, flexShrink: 0, background: SIDEBAR, borderRight: `1px solid ${BOR}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: P, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>顽</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: FG }}>顽童记</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sidebarItems.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: item.active ? `${P}15` : "transparent", color: item.active ? P : MUT, fontWeight: item.active ? 700 : 500, fontSize: 14, cursor: "pointer" }}>
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>

        {/* Stats in sidebar */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUT, padding: "0 8px", letterSpacing: "0.05em" }}>我的足迹</div>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: CARD, border: `1px solid ${BOR}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: MUT }}>{s.sub}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: FG }}>{s.value}<span style={{ fontSize: 10, fontWeight: 600, color: MUT, marginLeft: 2 }}>{s.label}</span></div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: FG, margin: 0, fontFamily: "Georgia, serif" }}>足迹地图</h1>
            <p style={{ fontSize: 13, color: MUT, margin: "4px 0 0" }}>已标记 12 个目的地 · 走过 8 个省份</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: CARD, border: `1px solid ${BOR}`, borderRadius: 12, padding: 4, gap: 2 }}>
              <button style={{ padding: "6px 14px", borderRadius: 8, background: P, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                散点
              </button>
              <button style={{ padding: "6px 14px", borderRadius: 8, background: "transparent", border: "none", color: MUT, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6l3 12 3-12h6"/><path d="M3 21h18"/></svg>
                路线
              </button>
            </div>
          </div>
        </div>

        {/* Map + Right Panel: two-column layout */}
        <div style={{ display: "flex", gap: 18, flex: 1 }}>

          {/* Map */}
          <div style={{ flex: 1, borderRadius: 20, overflow: "hidden", border: `1px solid ${BOR}`, boxShadow: "0 4px 24px rgba(42,26,10,0.10)", position: "relative", minHeight: 380 }}>
            <svg viewBox="200 110 420 260" width="100%" height="100%" style={{ display: "block", background: SEA }}>
              {/* Simplified China landmass */}
              <path d="M240,130 L290,120 L340,118 L400,122 L450,128 L500,135 L540,145 L570,160 L575,180 L565,200 L545,215 L520,225 L495,230 L465,235 L440,240 L410,245 L380,248 L350,245 L320,238 L295,230 L270,218 L250,205 L238,190 L233,170 Z" fill={LAND} stroke={LAND_STROKE} strokeWidth="1.2"/>
              {/* Northeast */}
              <path d="M450,118 L480,112 L510,115 L535,120 L550,132 L545,145 L510,140 L475,130 L455,122 Z" fill={LAND} stroke={LAND_STROKE} strokeWidth="0.8"/>
              {/* Inner sea */}
              <path d="M520,140 L560,145 L580,165 L575,185 L555,190 L535,185 L520,165 Z" fill={SEA} stroke={LAND_STROKE} strokeWidth="0.5"/>
              {/* Taiwan */}
              <ellipse cx="543" cy="218" rx="8" ry="14" fill={`${LAND}cc`} stroke={LAND_STROKE} strokeWidth="0.8"/>
              {/* Hainan */}
              <ellipse cx="468" cy="255" rx="10" ry="7" fill={`${LAND}cc`} stroke={LAND_STROKE} strokeWidth="0.8"/>
              {/* Province-ish outlines (light) */}
              <path d="M350,145 L380,140 L410,145 L410,175 L380,178 L350,172 Z" fill="none" stroke={LAND_STROKE} strokeWidth="0.5" strokeDasharray="3 2"/>
              <path d="M295,170 L330,165 L350,172 L350,200 L320,205 L290,198 Z" fill="none" stroke={LAND_STROKE} strokeWidth="0.5" strokeDasharray="3 2"/>
              <path d="M410,175 L450,172 L465,195 L450,215 L420,218 L405,200 Z" fill="none" stroke={LAND_STROKE} strokeWidth="0.5" strokeDasharray="3 2"/>

              {/* Animated-style route line */}
              <path d="M310,200 L360,180 L470,175 L490,195" fill="none" stroke={P} strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.5"/>

              {/* Markers */}
              {markers.map((m, i) => (
                <g key={i}>
                  <circle cx={m.cx} cy={m.cy} r={m.r + 4} fill={P} fillOpacity="0.15"/>
                  <circle cx={m.cx} cy={m.cy} r={m.r} fill={P} stroke="white" strokeWidth="2.5" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))" }}/>
                  {m.r > 7 && <circle cx={m.cx} cy={m.cy} r={3.5} fill="white"/>}
                  <text x={m.cx} y={m.cy - m.r - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={FG} style={{ pointerEvents: "none" }}>{m.label}</text>
                </g>
              ))}
            </svg>

            {/* Zoom controls */}
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {["+", "−", "⊡"].map((s, i) => (
                <div key={i} style={{ width: 30, height: 30, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", borderRadius: 8, border: `1px solid ${BOR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i === 2 ? 11 : 15, fontWeight: 700, color: FG, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                  {s}
                </div>
              ))}
            </div>

            {/* Hover tooltip simulation */}
            <div style={{ position: "absolute", left: 195, top: 140, background: "rgba(253,250,245,0.97)", backdropFilter: "blur(8px)", borderRadius: 14, border: `1px solid ${BOR}`, padding: "12px 14px", boxShadow: "0 4px 16px rgba(42,26,10,0.15)", minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: P }}/>
                <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>云南大理</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: FG, marginBottom: 4, fontFamily: "Georgia, serif" }}>遇见大理，遇见自己</div>
              <div style={{ fontSize: 11, color: MUT, marginBottom: 8 }}>2025.05.12 — 2025.05.17 · 5天</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: P }}>点击查看 →</div>
            </div>
          </div>

          {/* Right panel: Destination list */}
          <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: FG }}>最近足迹</span>
              <span style={{ fontSize: 11, color: P, fontWeight: 700, cursor: "pointer" }}>全部</span>
            </div>
            {destinations.map((d) => (
              <div key={d.id} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 16, padding: "12px 14px", boxShadow: "0 2px 8px rgba(42,26,10,0.06)", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, fontWeight: 600, color: MUT, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.place}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: moodColors[d.mood]?.bg, color: moodColors[d.mood]?.text }}>{d.mood}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: FG, marginBottom: 4, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: MUT }}>{d.date} · {d.days}天</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: P }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
