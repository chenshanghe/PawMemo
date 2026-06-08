export function MobileView() {
  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";
  const ACCENT = "#4A7C59";

  const entries = [
    { id: 1, title: "遇见大理，遇见自己", destination: "云南大理", date: "2025.05.12", days: 5, photos: 48, mood: "开心", color: "#C9A87C", tag: "休闲" },
    { id: 2, title: "西湖烟雨，诗意江南", destination: "浙江杭州", date: "2025.04.28", days: 3, photos: 31, mood: "平静", color: "#7C9CA8", tag: "文化" },
    { id: 3, title: "青城幽径，问道之旅", destination: "四川成都", date: "2025.03.15", days: 7, photos: 62, mood: "感动", color: "#7CA87C", tag: "自然" },
    { id: 4, title: "厦门海风，慢时光", destination: "福建厦门", date: "2025.02.08", days: 4, photos: 27, mood: "兴奋", color: "#A87C9C", tag: "美食" },
  ];

  const tags = ["全部", "休闲", "文化", "自然", "美食", "探险"];
  const moodColors: Record<string, { bg: string; text: string }> = {
    开心: { bg: "#FEF9C3", text: "#854D0E" },
    平静: { bg: "#DBEAFE", text: "#1E40AF" },
    感动: { bg: "#FCE7F3", text: "#9D174D" },
    兴奋: { bg: "#FFEDD5", text: "#9A3412" },
  };

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", maxWidth: 390, margin: "0 auto", position: "relative" }}>

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(245,240,232,0.94)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BOR}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: FG, fontFamily: "Georgia, serif" }}>旅记册</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 1 }}>3 篇游记 · 12 篇随记</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Search icon */}
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: `rgba(217,108,71,0.08)`, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          {/* Compose */}
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: P, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </header>

      {/* ── AI合成 Banner ── */}
      <div style={{ margin: "12px 16px 0", background: `linear-gradient(135deg, ${P}18, ${P}08)`, border: `1px solid ${P}30`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: P, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>AI 合成游记</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 1 }}>选 2 篇以上随记，自动生成完整游记</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: P, whiteSpace: "nowrap" }}>去合成 →</div>
      </div>

      {/* ── Tag Filter ── */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 16px", scrollbarWidth: "none" }}>
        {tags.map((t, i) => (
          <div key={t} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: i === 0 ? P : CARD, color: i === 0 ? "#fff" : MUT, border: `1px solid ${i === 0 ? P : BOR}` }}>{t}</div>
        ))}
      </div>

      {/* ── Entry Cards ── */}
      <div style={{ padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((entry, idx) => (
          <div key={entry.id} style={{ background: CARD, borderRadius: 20, border: `1px solid ${BOR}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(42,26,10,0.06)" }}>
            {/* Cover image area */}
            <div style={{ height: 140, background: `linear-gradient(135deg, ${entry.color}60, ${entry.color}30)`, position: "relative", display: "flex", alignItems: "flex-end" }}>
              {/* Mock image grid */}
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                <div style={{ flex: 1, background: `${entry.color}50`, margin: 4, borderRadius: 12 }} />
                <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 4, margin: "4px 4px 4px 0" }}>
                  <div style={{ flex: 1, background: `${entry.color}70`, borderRadius: 8 }} />
                  <div style={{ flex: 1, background: `${entry.color}40`, borderRadius: 8 }} />
                </div>
              </div>
              {/* Gradient overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }} />
              {/* Location + date */}
              <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{entry.destination}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginTop: 2, fontFamily: "Georgia, serif", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{entry.title}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {entry.mood && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: moodColors[entry.mood]?.bg ?? "#f3f4f6", color: moodColors[entry.mood]?.text ?? "#374151" }}>{entry.mood}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 12, color: MUT, fontSize: 11, fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  {entry.date}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  {entry.photos} 帧
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {entry.days} 天
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: P }}>阅读 →</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 390, background: "rgba(245,240,232,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${BOR}`, padding: "8px 0 20px", display: "flex", justifyContent: "space-around" }}>
        {[
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "随记" },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, label: "旅记", active: true },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>, label: "地图" },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>, label: "广场" },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "我" },
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
