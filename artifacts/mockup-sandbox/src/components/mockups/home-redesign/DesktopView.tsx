export function DesktopView() {
  const entries = [
    { id: 1, title: "遇见大理，遇见自己", destination: "云南大理", month: "05月", day: "12", days: 5, photos: 48, color: "#e8d5c4" },
    { id: 2, title: "西湖烟雨，诗意江南", destination: "浙江杭州", month: "04月", day: "28", days: 3, photos: 31, color: "#c4d5e8" },
    { id: 3, title: "青城幽径，问道之旅", destination: "四川成都", month: "03月", day: "15", days: 7, photos: 62, color: "#d5e8c4" },
    { id: 4, title: "鼓浪屿的慢时光", destination: "福建厦门", month: "02月", day: "03", days: 4, photos: 27, color: "#e8c4d5" },
  ];

  const P = "#D96C47";
  const BG = "#F5F0E8";
  const CARD = "#FDFAF5";
  const FG = "#2A1A0A";
  const MUT = "#8C7060";
  const BOR = "#D9CFC0";
  const SIDEBAR_W = 220;

  const navItems = [
    { label: "随记", active: true, path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
    { label: "旅记", active: false, path: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
    { label: "足迹地图", active: false, path: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" },
    { label: "广场", active: false, path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { label: "动态", active: false, path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { label: "相册", active: false, path: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" },
    { label: "规划", active: false, path: "M3 11l19-9-9 19-2-8-8-2z" },
    { label: "我", active: false, path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  ];

  return (
    <div style={{ fontFamily: "'Noto Serif SC', Georgia, serif", background: BG, minHeight: "100vh", display: "flex" }}>

      {/* 侧边栏 */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${BOR}`, background: "rgba(253,250,245,0.7)", backdropFilter: "blur(8px)", padding: "28px 16px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, padding: "0 6px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: P, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>顽</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: FG }}>顽童记</span>
        </div>

        {/* 导航 */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {navItems.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, background: item.active ? `rgba(217,108,71,0.10)` : "transparent", color: item.active ? P : MUT, fontWeight: item.active ? 700 : 400, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={item.active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.path} />
              </svg>
              {item.label}
            </div>
          ))}
        </nav>

        {/* 写随记按钮 */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: P, color: "#fff", borderRadius: 12, padding: "10px", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(217,108,71,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            写随记
          </div>
          {/* 用户卡片 */}
          <div style={{ background: "rgba(217,108,71,0.06)", border: `1px solid ${BOR}`, borderRadius: 14, padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${P}, #e89060)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>顽</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: FG }}>旅行爱好者</p>
                <p style={{ margin: 0, fontSize: 11, color: MUT }}>user@example.com</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: MUT }}>查看主页 →</span>
              {/* 退出：仅在此处显示，不在顶栏重复 */}
              <span style={{ fontSize: 11, color: MUT, display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                退出
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {/* 顶部工具栏 —— 改版：去掉重复的退出按钮 */}
        <div style={{ padding: "20px 36px 0", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(217,108,71,0.07)", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, background: P, borderRadius: "50%", border: `2px solid ${BG}` }} />
          </div>
        </div>

        <div style={{ padding: "12px 36px 60px", maxWidth: 900, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ paddingBottom: 28 }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.3, color: FG, margin: 0 }}>
              午后阳光正好，适合记录回忆
            </h2>
            <p style={{ marginTop: 10, fontSize: 13, color: MUT, letterSpacing: "0.15em" }}>
              顽童日记 · 旅途留声机
            </p>
          </div>

          {/* 统计卡 —— 改版：3个，全中文标签 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            {[
              { icon: "📖", label: "旅记总数", value: "12", unit: "篇" },
              { icon: "🌏", label: "到访城市", value: "8", unit: "城" },
              { icon: "📷", label: "珍藏定格", value: "168", unit: "帧" },
            ].map((s) => (
              <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 24, padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `rgba(217,108,71,0.05)`, borderRadius: "50%", transform: "translate(30%, -30%)" }} />
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(217,108,71,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: MUT, letterSpacing: "0.05em" }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: FG, lineHeight: 1 }}>
                    {s.value}<span style={{ fontSize: 13, fontWeight: 400, color: MUT, marginLeft: 3 }}>{s.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 最新旅记 */}
          <div style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 28, overflow: "hidden", marginBottom: 32, display: "flex" }}>
            <div style={{ width: 220, flexShrink: 0, background: `linear-gradient(135deg, ${entries[0].color} 0%, #c8b8a8 100%)`, position: "relative", display: "flex", alignItems: "flex-end", padding: 20 }}>
              <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 12px", fontSize: 11, color: "#fff", fontWeight: 700, letterSpacing: "0.08em" }}>
                最新旅记
              </div>
              <div style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{entries[0].destination}</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: FG }}>{entries[0].title}</h4>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: MUT }}>3天前在这里留下了足迹 · {entries[0].days}天行程 · {entries[0].photos}张照片</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: P, fontWeight: 700 }}>
                查看详情
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </div>

          {/* 翻阅回忆 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: FG, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 4, height: 22, background: P, borderRadius: 2, display: "inline-block" }} />
                翻阅回忆
              </h3>
              <span style={{ fontSize: 14, color: MUT }}>全部日记 ›</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {entries.map((e, i) => (
                <div key={e.id} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 24, overflow: "hidden", transition: "all 0.3s" }}>
                  <div style={{ height: 180, background: `linear-gradient(135deg, ${e.color} 0%, #c8b8a8 100%)`, position: "relative" }}>
                    <div style={{ position: "absolute", top: 14, left: 0, background: "rgba(253,250,245,0.96)", borderRadius: "0 10px 10px 0", padding: "5px 14px", display: "flex", gap: 6, alignItems: "baseline" }}>
                      <span style={{ fontWeight: 900, fontSize: 16, color: FG }}>{e.day}</span>
                      <span style={{ fontSize: 11, color: MUT }}>{e.month}</span>
                    </div>
                    <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{e.destination}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900, color: FG, lineHeight: 1.3 }}>{e.title}</h4>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 12, color: MUT, background: "rgba(217,108,71,0.08)", padding: "3px 10px", borderRadius: 8 }}>{e.days}天</span>
                        <span style={{ fontSize: 12, color: MUT, background: "rgba(217,108,71,0.08)", padding: "3px 10px", borderRadius: 8 }}>{e.photos}张</span>
                      </div>
                      <span style={{ fontSize: 12, color: P, fontWeight: 700 }}>阅读 →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 改版说明标注 */}
      <div style={{ position: "fixed", top: 16, right: 16, background: "rgba(217,108,71,0.95)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontSize: 10, fontWeight: 700, zIndex: 50, lineHeight: 1.8, boxShadow: "0 4px 16px rgba(217,108,71,0.4)" }}>
        改版亮点<br/>✓ 3项统计（新增到访城市）<br/>✓ 全部中文标签<br/>✓ 顶栏无重复退出按钮<br/>✓ 退出统一放在用户卡片
      </div>
    </div>
  );
}
