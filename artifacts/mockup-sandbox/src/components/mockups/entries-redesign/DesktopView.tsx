export function DesktopView() {
  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";
  const SIDEBAR = "#F0EBE0";

  const entries = [
    { id: 1, title: "遇见大理，遇见自己", destination: "云南大理", date: "2025.05.12", endDate: "2025.05.17", days: 5, photos: 48, mood: "开心", color: "#C9A87C", content: "苍山洱海之间，时光仿佛凝固。每一处转角都藏着惊喜，每一口米线都是对味蕾的温柔抚慰…" },
    { id: 2, title: "西湖烟雨，诗意江南", destination: "浙江杭州", date: "2025.04.28", endDate: "2025.04.30", days: 3, photos: 31, mood: "平静", color: "#7C9CA8", content: "清晨的断桥没有游客，只有薄雾与垂柳。这才是真正的西湖，属于每一个静心聆听的人…" },
    { id: 3, title: "青城幽径，问道之旅", destination: "四川成都", date: "2025.03.15", endDate: "2025.03.21", days: 7, photos: 62, mood: "感动", color: "#7CA87C", content: "沿着青石板路拾阶而上，竹影婆娑。在这里，喧嚣与烦恼都被那一缕清风带走了…" },
    { id: 4, title: "厦门海风，慢时光", destination: "福建厦门", date: "2025.02.08", endDate: "2025.02.11", days: 4, photos: 27, mood: "兴奋", color: "#A87C9C", content: "鼓浪屿的钢琴声穿过老宅的窗棂，海风裹着咸咸的味道，这座城市让人舍不得离开…" },
  ];

  const tags = ["全部", "休闲", "文化", "自然", "美食", "探险", "亲子"];
  const moodColors: Record<string, { bg: string; text: string }> = {
    开心: { bg: "#FEF9C3", text: "#854D0E" },
    平静: { bg: "#DBEAFE", text: "#1E40AF" },
    感动: { bg: "#FCE7F3", text: "#9D174D" },
    兴奋: { bg: "#FFEDD5", text: "#9A3412" },
  };

  const sidebarItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "随记" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, label: "旅记", active: true },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>, label: "地图" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>, label: "广场" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>, label: "规划" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "我" },
  ];

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", display: "flex" }}>

      {/* ── Sidebar ── */}
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

        <div style={{ marginTop: "auto" }}>
          <div style={{ padding: "12px", borderRadius: 14, background: `${P}10`, border: `1px solid ${P}25` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: P, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: FG }}>AI 合成游记</div>
                <div style={{ fontSize: 10, color: MUT }}>选随记自动生成</div>
              </div>
            </div>
            <button style={{ width: "100%", padding: "8px", borderRadius: 10, background: P, color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>开始合成</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto", maxWidth: 1060 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: FG, margin: 0, fontFamily: "Georgia, serif" }}>旅记册</h1>
            <p style={{ fontSize: 13, color: MUT, margin: "4px 0 0" }}>4 篇游记 · 记录了 19 天的远方</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BOR}`, borderRadius: 12, padding: "8px 14px", fontSize: 13, color: MUT }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              搜索旅记…
            </div>
            {/* View toggles */}
            <div style={{ display: "flex", background: CARD, border: `1px solid ${BOR}`, borderRadius: 12, padding: 4, gap: 2 }}>
              <button style={{ padding: "6px 10px", borderRadius: 8, background: P, border: "none", color: "#fff", display: "flex", alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </button>
              <button style={{ padding: "6px 10px", borderRadius: 8, background: "transparent", border: "none", color: MUT, display: "flex", alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </button>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 12, background: FG, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              新建旅记
            </button>
          </div>
        </div>

        {/* Tag pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {tags.map((t, i) => (
            <div key={t} style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: i === 0 ? P : CARD, color: i === 0 ? "#fff" : MUT, border: `1px solid ${i === 0 ? P : BOR}`, cursor: "pointer" }}>{t}</div>
          ))}
        </div>

        {/* Cards 2-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ background: CARD, borderRadius: 24, border: `1px solid ${BOR}`, overflow: "hidden", boxShadow: "0 2px 16px rgba(42,26,10,0.06)", transition: "all 0.3s" }}>
              {/* Cover */}
              <div style={{ height: 180, background: `linear-gradient(135deg, ${entry.color}60, ${entry.color}28)`, position: "relative" }}>
                {/* Photo grid simulation */}
                <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 80px", gridTemplateRows: "1fr 1fr", gap: 4, padding: 8 }}>
                  <div style={{ gridRow: "1 / 3", background: `${entry.color}55`, borderRadius: 14 }} />
                  <div style={{ background: `${entry.color}70`, borderRadius: 10 }} />
                  <div style={{ background: `${entry.color}40`, borderRadius: 10 }} />
                </div>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 55%)" }} />
                <div style={{ position: "absolute", top: 12, left: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 999, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {entry.destination}
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "Georgia, serif", textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1.3 }}>{entry.title}</h3>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{entry.date}{entry.endDate ? ` — ${entry.endDate}` : ""}</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: MUT, margin: "0 0 12px", lineHeight: 1.6, display: "-webkit-box", overflow: "hidden" }}>
                  "{entry.content}"
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${BOR}` }}>
                  <div style={{ display: "flex", gap: 12, color: MUT, fontSize: 11, fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {entry.days} 天
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      {entry.photos} 帧
                    </span>
                    {entry.mood && (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: moodColors[entry.mood]?.bg ?? "#f3f4f6", color: moodColors[entry.mood]?.text ?? "#374151", fontSize: 10, fontWeight: 700 }}>{entry.mood}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P }}>阅读 →</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
