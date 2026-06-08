export function MobileView() {
  const entries = [
    { id: 1, title: "遇见大理，遇见自己", destination: "云南大理", month: "05月", day: "12", days: 5, photos: 48, color: "#e8d5c4" },
    { id: 2, title: "西湖烟雨，诗意江南", destination: "浙江杭州", month: "04月", day: "28", days: 3, photos: 31, color: "#c4d5e8" },
    { id: 3, title: "青城幽径，问道之旅", destination: "四川成都", month: "03月", day: "15", days: 7, photos: 62, color: "#d5e8c4" },
  ];

  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", maxWidth: 390, margin: "0 auto", position: "relative", overflowX: "hidden" }}>

      {/* Header —— 改版：只保留铃铛 + 加号，退出按钮移走 */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(245,240,232,0.94)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BOR}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: P, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>顽</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: FG }}>顽童记</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 铃铛 */}
          <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(217,108,71,0.08)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, background: P, borderRadius: "50%", border: `2px solid ${BG}` }} />
          </div>
          {/* 加号写随记 */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(217,108,71,0.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
      </header>

      <div style={{ padding: "16px 16px 130px" }}>

        {/* Hero */}
        <div style={{ paddingTop: 4, paddingBottom: 20 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.4, color: FG, margin: 0 }}>
            午后阳光正好，<br />适合记录回忆
          </h2>
          <p style={{ marginTop: 8, fontSize: 12, color: MUT, letterSpacing: "0.15em" }}>
            顽童日记 · 旅途留声机
          </p>
        </div>

        {/* 统计卡 —— 改版：3个（加入"足迹城市"），去掉英文 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { icon: "📖", label: "旅记总数", value: "12", unit: "篇" },
            { icon: "🌏", label: "到访城市", value: "8", unit: "城" },
            { icon: "📷", label: "珍藏定格", value: "168", unit: "帧" },
          ].map((s) => (
            <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 20, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <p style={{ fontSize: 10, color: MUT, margin: 0, letterSpacing: "0.03em", textAlign: "center" }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: FG, margin: 0, lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 10, fontWeight: 400, color: MUT, marginLeft: 2 }}>{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* 最新旅记 */}
        <div style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: 130, background: `linear-gradient(135deg, ${entries[0].color} 0%, #c8b8a8 100%)`, position: "relative", display: "flex", alignItems: "flex-end", padding: 14 }}>
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "#fff", fontWeight: 700, letterSpacing: "0.08em" }}>
              最新旅记
            </div>
            <div style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{entries[0].destination}</span>
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 900, color: FG }}>{entries[0].title}</h4>
            <p style={{ margin: 0, fontSize: 12, color: MUT }}>3天前 · {entries[0].days}天行程 · {entries[0].photos}张照片</p>
          </div>
        </div>

        {/* 翻阅回忆 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: FG, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 18, background: P, borderRadius: 2, display: "inline-block" }} />
              翻阅回忆
            </h3>
            <span style={{ fontSize: 13, color: MUT }}>全部日记 ›</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {entries.slice(1).map((e, i) => (
              <div key={e.id} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 20, overflow: "hidden", marginTop: i % 2 === 1 ? 20 : 0 }}>
                <div style={{ height: 100, background: `linear-gradient(135deg, ${e.color} 0%, #c8b8a8 100%)`, position: "relative" }}>
                  <div style={{ position: "absolute", top: 8, left: 0, background: "rgba(253,250,245,0.96)", borderRadius: "0 8px 8px 0", padding: "3px 10px", display: "flex", gap: 4, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 900, fontSize: 13, color: FG }}>{e.day}</span>
                    <span style={{ fontSize: 9, color: MUT }}>{e.month}</span>
                  </div>
                  <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(6px)", borderRadius: 7, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{e.destination}</span>
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: FG, lineHeight: 1.3 }}>{e.title}</h4>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ fontSize: 10, color: MUT, background: "rgba(217,108,71,0.08)", padding: "2px 7px", borderRadius: 6 }}>{e.days}天</span>
                    <span style={{ fontSize: 10, color: MUT, background: "rgba(217,108,71,0.08)", padding: "2px 7px", borderRadius: 6 }}>{e.photos}张</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部导航 —— 改版：5个 Tab（去掉低频的"规划"移到"我"页面内）*/}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "rgba(245,240,232,0.97)", backdropFilter: "blur(14px)", borderTop: `1px solid ${BOR}`, display: "flex", justifyContent: "space-around", padding: "8px 0 18px", zIndex: 40 }}>
        {[
          { label: "随记", active: true, path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
          { label: "旅记", active: false, path: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
          { label: "地图", active: false, path: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" },
          { label: "广场", active: false, path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
          { label: "我", active: false, path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
        ].map((tab) => (
          <div key={tab.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "2px 10px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tab.active ? P : MUT} strokeWidth={tab.active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.path} />
            </svg>
            <span style={{ fontSize: 10, fontWeight: tab.active ? 700 : 500, color: tab.active ? P : MUT }}>{tab.label}</span>
            {tab.active && <span style={{ width: 4, height: 4, borderRadius: "50%", background: P }} />}
          </div>
        ))}
      </nav>

      {/* 改版说明标注 */}
      <div style={{ position: "fixed", top: 68, right: 6, background: "rgba(217,108,71,0.95)", color: "#fff", borderRadius: 10, padding: "6px 10px", fontSize: 9, fontWeight: 700, zIndex: 50, lineHeight: 1.6, boxShadow: "0 4px 12px rgba(217,108,71,0.4)" }}>
        改版亮点<br/>✓ 3项统计数据<br/>✓ 全部中文<br/>✓ 简洁顶栏<br/>✓ 5个导航项
      </div>
    </div>
  );
}
