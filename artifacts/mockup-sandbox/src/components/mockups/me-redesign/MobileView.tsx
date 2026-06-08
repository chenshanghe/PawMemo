import React, { useState, useRef, useEffect } from "react";
import {
  Pencil, Camera, Bookmark, BookText, BarChart2,
  MapPin, CalendarDays, Sparkles, Award, MessageSquare,
  LogOut, ChevronRight, Trash2, FileText,
  Plus, Download, Receipt, Map, Settings, Bell, X,
} from "lucide-react";

const P = "#D96C47";
const FG = "#2A1A0A";
const MUT = "#8C7060";
const BOR = "#D9CFC0";
const BG = "#F5F0E8";
const CARD = "#FDFAF5";

type Tab = "notes" | "favorites" | "plans" | "data";

const mockNotes = [
  { id: 1, title: "京都赏枫五日", dest: "京都", date: "2024-11-10", mood: "感动", vis: "public", photos: 28 },
  { id: 2, title: "西藏自驾之旅", dest: "拉萨", date: "2024-08-03", mood: "兴奋", vis: "private", photos: 64 },
  { id: 3, title: "云南洱海慢行", dest: "大理", date: "2024-05-18", mood: "平静", vis: "public", photos: 41 },
];

const mockPlans = [
  { id: 1, title: "成都→重庆 5 日美食文化游", from: "北京", dests: ["成都", "重庆"], nights: 4, mode: "高铁", group: "👫 朋友", date: "2025-03" },
  { id: 2, title: "三亚家庭亲子海岛度假", from: "上海", dests: ["三亚"], nights: 6, mode: "飞机", group: "👨‍👩‍👧 家庭", date: "2025-02" },
];

const MOOD_COLOR: Record<string, string> = {
  感动: "#FDE8F0", 兴奋: "#FEE2E2", 平静: "#DBEAFE", 开心: "#FEF9C3", 疲惫: "#F3F4F6", 思念: "#EDE9FE",
};

const settingsItems = [
  { icon: <Award style={{ width: 14, height: 14, color: P }} />, label: "旅行成就" },
  { icon: <Bell style={{ width: 14, height: 14, color: P }} />, label: "消息通知" },
  { icon: <FileText style={{ width: 14, height: 14, color: P }} />, label: "每周旅行回顾" },
  { icon: <Receipt style={{ width: 14, height: 14, color: P }} />, label: "支付记录" },
  { icon: <Download style={{ width: 14, height: 14, color: P }} />, label: "导出数据" },
  { icon: <MessageSquare style={{ width: 14, height: 14, color: P }} />, label: "意见反馈" },
  { icon: <LogOut style={{ width: 14, height: 14, color: "#EF4444" }} />, label: "退出登录", danger: true },
];

export default function MobileView() {
  const [tab, setTab] = useState<Tab>("plans");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "notes",     label: "旅记",  icon: <BookText style={{ width: 13, height: 13 }} /> },
    { key: "favorites", label: "收藏",  icon: <Bookmark style={{ width: 13, height: 13 }} /> },
    { key: "plans",     label: "规划",  icon: <Map style={{ width: 13, height: 13 }} /> },
    { key: "data",      label: "数据",  icon: <BarChart2 style={{ width: 13, height: 13 }} /> },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif", maxWidth: 390, margin: "0 auto", position: "relative" }}>

      {/* ── Settings Dropdown Overlay ── */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setSettingsOpen(false)}>
          <div
            style={{
              position: "absolute", top: 52, right: 12,
              background: CARD, borderRadius: 16,
              border: `1px solid ${BOR}`,
              boxShadow: "0 8px 32px rgba(42,26,10,.15)",
              minWidth: 180, overflow: "hidden",
              animation: "fadeIn 0.15s ease",
            }}
            onClick={e => e.stopPropagation()}
          >
            {settingsItems.map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 16px",
                  borderBottom: i < settingsItems.length - 1 ? `1px solid ${BOR}50` : "none",
                  cursor: "pointer",
                  background: "transparent",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: (item as any).danger ? "#FEF2F2" : `${P}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: (item as any).danger ? "#EF4444" : FG }}>
                  {item.label}
                </span>
                {!(item as any).danger && <ChevronRight style={{ width: 13, height: 13, color: BOR, marginLeft: "auto" }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cover gradient + Header ── */}
      <div style={{ height: 128, background: `linear-gradient(135deg, ${P}88 0%, #F4A261 60%, #FBD28A 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(245,240,232,0.96) 0%, transparent 55%)" }} />
        {/* Header bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
          <span style={{ color: "#fff", fontSize: 20, fontWeight: 900, fontFamily: "Georgia, serif", textShadow: "0 1px 4px rgba(0,0,0,.22)" }}>我的</span>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Edit button */}
            <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
              <Pencil style={{ width: 11, height: 11 }} />
              编辑主页
            </button>
            {/* Settings icon */}
            <button
              onClick={() => setSettingsOpen(v => !v)}
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.5)", background: settingsOpen ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {settingsOpen
                ? <X style={{ width: 14, height: 14, color: "#fff" }} />
                : <Settings style={{ width: 14, height: 14, color: "#fff" }} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Identity ── */}
      <div style={{ padding: "0 16px", marginTop: -56 }}>
        {/* Avatar */}
        <div style={{ position: "relative", width: 76, marginBottom: 10 }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: `linear-gradient(135deg, ${P}33, #FBD28A55)`, border: `3.5px solid ${BG}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: P, boxShadow: "0 2px 12px rgba(0,0,0,.12)" }}>
            旅
          </div>
          <div style={{ position: "absolute", bottom: 0, right: -2, width: 24, height: 24, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}>
            <Camera style={{ width: 12, height: 12, color: "#fff" }} />
          </div>
        </div>

        {/* Name + tier */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>旅行者小明</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: `${P}18`, color: P }}>Pro</span>
        </div>
        <p style={{ fontSize: 11, color: MUT, marginTop: 2 }}>旅行号：user_abc123</p>
        <p style={{ fontSize: 12, color: `${FG}cc`, marginTop: 5, lineHeight: 1.6 }}>热爱探索世界每个角落，用镜头记录美好瞬间 🌏</p>

        {/* 4-stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
          {[
            { label: "日记", val: 23 }, { label: "城市", val: 18 },
            { label: "关注", val: 42 }, { label: "粉丝", val: 117 },
          ].map(s => (
            <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: MUT, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI usage card */}
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, background: CARD, border: `1px solid ${BOR}60` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles style={{ width: 13, height: 13, color: P }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: FG }}>AI 叙事用量</span>
            </div>
            <span style={{ fontSize: 10, color: MUT }}>本月 3 / 5 次</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: `${BOR}60`, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", borderRadius: 999, background: P }} />
          </div>
          <div style={{ display: "flex", marginTop: 8, gap: 6 }}>
            <button style={{ flex: 1, padding: "5px 0", borderRadius: 8, background: P, color: "#fff", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer" }}>升级 Pro · ¥28/月</button>
            <button style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", fontSize: 10, color: MUT, cursor: "pointer" }}>套餐对比</button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ marginTop: 16, borderBottom: `1px solid ${BOR}60`, display: "flex", padding: "0 16px" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "9px 14px",
              fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? P : MUT,
              borderBottom: `2px solid ${tab === t.key ? P : "transparent"}`,
              background: "transparent", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid",
              borderBottomColor: tab === t.key ? P : "transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: "12px 16px 100px" }}>

        {/* Notes tab */}
        {tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mockNotes.map(n => (
              <div key={n.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, overflow: "hidden", display: "flex" }}>
                <div style={{ width: 72, background: `linear-gradient(135deg, ${P}22, #FBD28A33)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🌍</div>
                <div style={{ flex: 1, padding: "10px 10px 10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{n.title}</span>
                    {n.mood && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 999, background: MOOD_COLOR[n.mood] ?? "#eee", color: `${FG}99` }}>{n.mood}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUT }}><MapPin style={{ width: 9, height: 9 }} />{n.dest}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUT }}><CalendarDays style={{ width: 9, height: 9 }} />{n.date.slice(0, 7)}</span>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: n.vis === "public" ? "#D1FAE5" : "#F3F4F6", color: n.vis === "public" ? "#059669" : "#6B7280" }}>
                      {n.vis === "public" ? "公开" : "私密"}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: MUT, marginTop: 3 }}>{n.photos} 帧照片</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", padding: "0 10px" }}>
                  <ChevronRight style={{ width: 14, height: 14, color: BOR }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plans tab */}
        {tab === "plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* New plan CTA */}
            <button style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 0", borderRadius: 16, background: P, color: "#fff",
              fontSize: 13, fontWeight: 700, border: "none",
              boxShadow: `0 4px 14px ${P}55`, cursor: "pointer",
            }}>
              <Plus style={{ width: 16, height: 16 }} />
              新建 AI 旅行规划
            </button>

            <p style={{ fontSize: 11, color: MUT, margin: "2px 0" }}>已保存的规划 · {mockPlans.length} 份</p>

            {mockPlans.map(p => (
              <div key={p.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${P}18, #FBD28A28)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✈️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1.3, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: MUT }}>{p.from} → {p.dests.join("、")} · {p.nights} 晚</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "#EDE9FE", color: "#6D28D9" }}>{p.group}</span>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "#DBEAFE", color: "#1D4ED8" }}>{p.mode}</span>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: `${BOR}50`, color: MUT }}>{p.date}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    <button style={{ padding: "5px 10px", borderRadius: 8, background: `${P}12`, color: P, fontSize: 10, fontWeight: 700, border: `1px solid ${P}25`, cursor: "pointer" }}>查看</button>
                    <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", cursor: "pointer" }}>
                      <Trash2 style={{ width: 11, height: 11, color: MUT }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center", padding: "12px 0 4px", color: MUT, fontSize: 11 }}>
              用 AI 一键生成专属行程，支持保存随时查看 ✈️
            </div>
          </div>
        )}

        {/* Favorites tab */}
        {tab === "favorites" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["雪山脚下的藏式民宿", "重庆解放碑夜市穿梭记", "云南梯田日出全记录"].map((t, i) => (
              <div key={i} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${P}22, #FBD28A33)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{t}</div>
                  <div style={{ fontSize: 10, color: MUT, marginTop: 3 }}>收藏于上周</div>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: BOR }} />
              </div>
            ))}
          </div>
        )}

        {/* Data tab */}
        {tab === "data" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { val: "23", label: "旅记总数", icon: "📓" }, { val: "18", label: "去过城市", icon: "🏙" },
                { val: "134", label: "旅行天数", icon: "☀️" }, { val: "1,240", label: "照片总数", icon: "📷" },
              ].map(s => (
                <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "12px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: FG, marginBottom: 10 }}>月度记录趋势</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
                {[2,3,1,4,2,5,3,2,4,3,1,2].map((v,i) => (
                  <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", background: i===6 ? P : `${P}40`, height: `${v/5*100}%` }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["1","4","7","12"].map(m => <span key={m} style={{ fontSize: 8, color: MUT }}>{m}月</span>)}
              </div>
            </div>
            <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, border: `1px solid ${BOR}`, background: CARD, fontSize: 12, fontWeight: 600, color: FG, cursor: "pointer" }}>
              <Download style={{ width: 13, height: 13, color: P }} />
              导出全部旅行数据
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
