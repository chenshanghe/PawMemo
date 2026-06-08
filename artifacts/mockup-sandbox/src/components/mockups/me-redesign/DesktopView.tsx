import React, { useState } from "react";
import {
  Pencil, Camera, Bookmark, BookText, BarChart2,
  MapPin, CalendarDays, Sparkles, Award, MessageSquare,
  LogOut, ChevronRight, Trash2, FileText, Bell,
  Plus, Download, Receipt, Map, Zap, Users,
  Star, Globe, Lock, EyeOff, Settings, X, AlertTriangle,
} from "lucide-react";

const P = "#D96C47";
const FG = "#2A1A0A";
const MUT = "#8C7060";
const BOR = "#D9CFC0";
const BG = "#F5F0E8";
const CARD = "#FDFAF5";

type Tab = "notes" | "favorites" | "following" | "followers" | "plans" | "data";

const mockNotes = [
  { id: 1, title: "京都赏枫五日记", dest: "京都", date: "2024-11-10", mood: "感动", vis: "public", photos: 28 },
  { id: 2, title: "西藏自驾之旅", dest: "拉萨", date: "2024-08-03", mood: "兴奋", vis: "private", photos: 64 },
  { id: 3, title: "云南洱海慢行", dest: "大理", date: "2024-05-18", mood: "平静", vis: "public", photos: 41 },
  { id: 4, title: "敦煌大漠朝圣", dest: "敦煌", date: "2024-03-22", mood: "感动", vis: "public", photos: 55 },
];

const mockPlans = [
  { id: 1, title: "成都→重庆 5 日美食文化游", from: "北京", dests: ["成都", "重庆"], nights: 4, mode: "高铁", group: "👫 朋友", date: "2025-03", style: "美食之旅" },
  { id: 2, title: "三亚家庭亲子海岛度假", from: "上海", dests: ["三亚"], nights: 6, mode: "飞机", group: "👨‍👩‍👧 家庭", date: "2025-02", style: "休闲放松" },
  { id: 3, title: "黄山徽州四日文化探索", from: "南京", dests: ["黄山", "宏村"], nights: 3, mode: "自驾", group: "💑 情侣", date: "2024-10", style: "文化探索" },
];

const topDests = [
  { dest: "京都", count: 4 }, { dest: "大理", count: 3 }, { dest: "成都", count: 2 }, { dest: "拉萨", count: 2 }, { dest: "敦煌", count: 1 },
];

const moodCounts = [
  { mood: "感动", count: 8, color: "#F472B6" }, { mood: "兴奋", count: 6, color: "#FB923C" },
  { mood: "平静", count: 5, color: "#60A5FA" }, { mood: "开心", count: 4, color: "#FBBF24" },
];

const MOOD_COLOR: Record<string, string> = {
  感动: "#FDE8F0", 兴奋: "#FEE2E2", 平静: "#DBEAFE", 开心: "#FEF9C3", 疲惫: "#F3F4F6", 思念: "#EDE9FE",
};

const settingsMenu = [
  { icon: <FileText style={{ width: 13, height: 13, color: P }} />, label: "每周旅行回顾", sub: "邮件摘要", toggle: true },
  { icon: <Receipt style={{ width: 13, height: 13, color: P }} />, label: "支付记录", sub: "历史订单与发票" },
  { icon: <Zap style={{ width: 13, height: 13, color: P }} />, label: "管理套餐", sub: "续费 / 取消" },
  { icon: <Download style={{ width: 13, height: 13, color: P }} />, label: "导出数据", sub: "备份日记/照片/收藏" },
  { icon: <MessageSquare style={{ width: 13, height: 13, color: P }} />, label: "意见反馈", sub: "告诉我们你的想法" },
  { icon: <Award style={{ width: 13, height: 13, color: P }} />, label: "旅行成就", sub: "解锁专属勋章" },
  { icon: <AlertTriangle style={{ width: 13, height: 13, color: "#EF4444" }} />, label: "注销账号", sub: "永久删除所有数据", danger: true },
  { icon: <LogOut style={{ width: 13, height: 13, color: "#EF4444" }} />, label: "退出登录", sub: "", danger: true },
];

export default function DesktopView() {
  const [tab, setTab] = useState<Tab>("plans");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [digestOn, setDigestOn] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "notes",     label: "旅记",  icon: <BookText style={{ width: 13, height: 13 }} />, count: 23 },
    { key: "favorites", label: "收藏",  icon: <Bookmark style={{ width: 13, height: 13 }} /> },
    { key: "following", label: "关注",  icon: <Users style={{ width: 13, height: 13 }} />, count: 42 },
    { key: "followers", label: "粉丝",  icon: <Users style={{ width: 13, height: 13 }} />, count: 117 },
    { key: "plans",     label: "规划",  icon: <Map style={{ width: 13, height: 13 }} />, count: 3 },
    { key: "data",      label: "数据",  icon: <BarChart2 style={{ width: 13, height: 13 }} /> },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif", position: "relative" }}>

      {/* ── Settings dropdown overlay ── */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setSettingsOpen(false)}>
          <div
            style={{ position: "absolute", top: 52, right: 16, background: CARD, borderRadius: 16, border: `1px solid ${BOR}`, boxShadow: "0 8px 32px rgba(42,26,10,.15)", minWidth: 220, overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            {settingsMenu.map((item, i) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < settingsMenu.length - 1 ? `1px solid ${BOR}40` : "none", cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: (item as any).danger ? "#FEF2F2" : `${P}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: (item as any).danger ? "#EF4444" : FG }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 10, color: MUT }}>{item.sub}</div>}
                </div>
                {(item as any).toggle ? (
                  <div onClick={() => setDigestOn(v => !v)} style={{ width: 34, height: 18, borderRadius: 999, background: digestOn ? P : `${BOR}90`, position: "relative", cursor: "pointer", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: digestOn ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                  </div>
                ) : !(item as any).danger ? (
                  <ChevronRight style={{ width: 12, height: 12, color: BOR, flexShrink: 0 }} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Header bar ── */}
      <div style={{ borderBottom: `1px solid ${BOR}60`, background: `${CARD}cc`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "Georgia, serif", color: FG }}>我的</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, border: `1px solid ${BOR}`, background: BG, fontSize: 12, fontWeight: 600, color: FG, cursor: "pointer" }}>
            <Pencil style={{ width: 11, height: 11 }} />编辑主页
          </button>
          <button
            onClick={() => setSettingsOpen(v => !v)}
            style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${BOR}`, background: settingsOpen ? `${P}15` : BG, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            {settingsOpen ? <X style={{ width: 14, height: 14, color: P }} /> : <Settings style={{ width: 14, height: 14, color: MUT }} />}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px", display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Profile card */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ height: 80, background: `linear-gradient(135deg, ${P}88 0%, #F4A261 60%, #FBD28A 100%)`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(253,250,245,.7))" }} />
            </div>
            <div style={{ padding: "0 18px 18px", marginTop: -36 }}>
              <div style={{ position: "relative", width: 68, marginBottom: 10 }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: `linear-gradient(135deg, ${P}33, #FBD28A55)`, border: `3px solid ${CARD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: P, boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>旅</div>
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 20, height: 20, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera style={{ width: 10, height: 10, color: "#fff" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif", color: FG }}>旅行者小明</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: `${P}18`, color: P }}>Pro</span>
              </div>
              <p style={{ fontSize: 10, color: MUT, marginTop: 2 }}>旅行号：user_abc123</p>
              <p style={{ fontSize: 11, color: `${FG}cc`, marginTop: 5, lineHeight: 1.6 }}>热爱探索世界每个角落，用镜头记录美好瞬间 🌏</p>

              {/* Stats 2x2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12 }}>
                {[{ val: 23, label: "旅记" }, { val: 18, label: "城市" }, { val: 42, label: "关注" }, { val: 117, label: "粉丝" }].map(s => (
                  <div key={s.label} style={{ background: BG, border: `1px solid ${BOR}50`, borderRadius: 10, padding: "7px 8px", textAlign: "center", cursor: "pointer" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: MUT, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI usage card — 2 bars */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
              <Sparkles style={{ width: 12, height: 12, color: P }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: FG }}>AI 用量</span>
            </div>
            {/* Compose bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: MUT }}>AI 叙事</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: FG }}>3 / 5 次</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: `${BOR}60`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "60%", borderRadius: 999, background: P }} />
              </div>
            </div>
            {/* Enhance bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: MUT }}>AI 优化</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: FG }}>8 / 20 次</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: `${BOR}60`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "40%", borderRadius: 999, background: "#F59E0B" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button style={{ flex: 1, padding: "5px 0", borderRadius: 8, background: P, color: "#fff", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer" }}>升级 Pro · ¥28/月</button>
              <button style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", fontSize: 10, color: MUT, cursor: "pointer" }}>Plus ¥68</button>
            </div>
          </div>

          {/* Quick stats desktop only */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[{ val: 134, label: "旅行天数", icon: "☀️" }, { val: "1.2k", label: "照片总数", icon: "📷" }].map(s => (
              <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{s.val}</div>
                <div style={{ fontSize: 9, color: MUT }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* PWA install */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${P}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell style={{ width: 14, height: 14, color: P }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: FG }}>安装到桌面</div>
              <div style={{ fontSize: 9, color: MUT }}>随时一键打开顽童日记</div>
            </div>
            <ChevronRight style={{ width: 12, height: 12, color: BOR }} />
          </div>
        </div>

        {/* ═══ RIGHT CONTENT ═══ */}
        <div>
          {/* Tabs — 6 tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BOR}60`, marginBottom: 16, overflowX: "auto" }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
                fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? P : MUT,
                borderBottom: `2px solid ${tab === t.key ? P : "transparent"}`,
                background: "transparent", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid",
                borderBottomColor: tab === t.key ? P : "transparent",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {t.icon}{t.label}
                {t.count != null && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: tab === t.key ? `${P}18` : `${BOR}60`, color: tab === t.key ? P : MUT }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── NOTES TAB ── */}
          {tab === "notes" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {mockNotes.map(n => (
                <div key={n.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ height: 110, background: `linear-gradient(135deg, ${P}22, #FBD28A33)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative" }}>
                    🌍
                    {n.mood && <div style={{ position: "absolute", top: 8, right: 8, padding: "2px 7px", borderRadius: 999, background: `${MOOD_COLOR[n.mood]}cc`, fontSize: 9, color: `${FG}aa` }}>{n.mood}</div>}
                    <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,.35)", borderRadius: 6, padding: "2px 7px" }}>
                      <MapPin style={{ width: 8, height: 8, color: "#fff" }} />
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{n.dest}</span>
                    </div>
                    <div style={{ position: "absolute", top: 8, left: 8, padding: "2px 6px", borderRadius: 4, background: n.vis === "public" ? "rgba(5,150,105,.7)" : "rgba(100,100,100,.5)", fontSize: 9, color: "#fff" }}>
                      {n.vis === "public" ? "公开" : "私密"}
                    </div>
                  </div>
                  <div style={{ padding: "9px 12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", marginBottom: 4 }}>{n.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: MUT }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><CalendarDays style={{ width: 9, height: 9 }} />{n.date.slice(0, 7)}</span>
                      <span style={{ marginLeft: "auto" }}>{n.photos} 帧</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── FOLLOWING TAB ── */}
          {tab === "following" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["@山野旅行家", "@云端漫步者", "@四季行者"].map((u, i) => (
                <div key={i} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${P}25, #FBD28A35)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧭</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{u}</div>
                    <div style={{ fontSize: 10, color: MUT }}>已关注 · {12 + i * 7} 篇旅记</div>
                  </div>
                  <button style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${BOR}`, background: "transparent", fontSize: 10, color: MUT, cursor: "pointer" }}>已关注</button>
                </div>
              ))}
            </div>
          )}

          {/* ── FOLLOWERS TAB ── */}
          {tab === "followers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["@探索者阿南", "@候鸟旅人", "@远方的风"].map((u, i) => (
                <div key={i} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, #60A5FA25, #A78BFA35)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🌍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{u}</div>
                    <div style={{ fontSize: 10, color: MUT }}>粉丝 · 关注于 {["上周", "3天前", "今天"][i]}</div>
                  </div>
                  <button style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${P}40`, background: `${P}10`, fontSize: 10, color: P, fontWeight: 700, cursor: "pointer" }}>+ 回关</button>
                </div>
              ))}
            </div>
          )}

          {/* ── FAVORITES TAB ── */}
          {tab === "favorites" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["雪山脚下的藏式民宿", "重庆解放碑夜市穿梭记", "云南梯田日出全记录", "成都宽窄巷子漫步"].map((t, i) => (
                <div key={i} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ height: 100, background: `linear-gradient(135deg, ${P}18, #FBD28A28)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🌄</div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{t}</div>
                    <div style={{ fontSize: 10, color: MUT, marginTop: 4 }}>旅行者用户 · 收藏于上周</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PLANS TAB ── */}
          {tab === "plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* New plan CTA */}
              {!showPlanForm ? (
                <div
                  onClick={() => setShowPlanForm(true)}
                  style={{ background: `linear-gradient(135deg, ${P}15, #FBD28A18)`, border: `1px solid ${P}30`, borderRadius: 18, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: P, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${P}50` }}>
                    <Plus style={{ width: 22, height: 22, color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: FG, marginBottom: 2 }}>新建 AI 旅行规划</div>
                    <div style={{ fontSize: 11, color: MUT }}>输入目的地，AI 自动生成逐日行程、餐厅推荐与订票链接</div>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: P, flexShrink: 0 }} />
                </div>
              ) : (
                /* Planning form (embedded) */
                <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 18, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>✨ 新建 AI 旅行规划</span>
                    <button onClick={() => setShowPlanForm(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                      <X style={{ width: 16, height: 16, color: MUT }} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: FG, display: "block", marginBottom: 4 }}>出发城市</label>
                      <div style={{ padding: "7px 11px", borderRadius: 10, border: `1px solid ${BOR}`, background: BG, fontSize: 12, color: MUT }}>北京</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: FG, display: "block", marginBottom: 4 }}>目的地</label>
                      <div style={{ padding: "7px 11px", borderRadius: 10, border: `1px solid ${P}50`, background: BG, fontSize: 12, color: FG }}>成都</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: FG, display: "block", marginBottom: 4 }}>出发日期</label>
                      <div style={{ padding: "7px 11px", borderRadius: 10, border: `1px solid ${BOR}`, background: BG, fontSize: 12, color: MUT }}>2025-05-01</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: FG, display: "block", marginBottom: 4 }}>返回日期</label>
                      <div style={{ padding: "7px 11px", borderRadius: 10, border: `1px solid ${BOR}`, background: BG, fontSize: 12, color: MUT }}>2025-05-06</div>
                    </div>
                  </div>
                  {/* Options row */}
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["👫 朋友", "✈️ 飞机", "💰💰 舒适", "文化探索"].map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, border: `1px solid ${P}30`, background: `${P}10`, color: P, fontWeight: 600 }}>{tag}</span>
                    ))}
                    <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, border: `1px solid ${BOR}`, color: MUT }}>🥦 素食友好</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: FG, display: "block", marginBottom: 6 }}>旅行风格</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["文化探索","美食之旅","自然风光","亲子游","休闲放松"].map(s => (
                        <span key={s} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, border: `1px solid ${s === "文化探索" ? P : BOR}`, background: s === "文化探索" ? P : "transparent", color: s === "文化探索" ? "#fff" : MUT, cursor: "pointer" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <button style={{ marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 12, background: `linear-gradient(to right, ${P}, #F97316)`, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ✨ 生成 AI 行程
                  </button>
                </div>
              )}

              <p style={{ fontSize: 11, color: MUT }}>已保存的规划 · {mockPlans.length} 份</p>

              {mockPlans.map(p => (
                <div key={p.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${P}18, #FBD28A28)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✈️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", marginBottom: 3 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: MUT, marginBottom: 6 }}>{p.from} → {p.dests.join("、")} · {p.nights} 晚 · {p.date}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "#EDE9FE", color: "#6D28D9" }}>{p.group}</span>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "#DBEAFE", color: "#1D4ED8" }}>{p.mode}</span>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: `${BOR}50`, color: MUT }}>{p.style}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button style={{ padding: "5px 12px", borderRadius: 8, background: `${P}12`, color: P, fontSize: 11, fontWeight: 700, border: `1px solid ${P}25`, cursor: "pointer" }}>查看规划</button>
                    <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Trash2 style={{ width: 12, height: 12, color: MUT }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── DATA TAB ── */}
          {tab === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Key stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { val: "23", label: "旅记总数", icon: "📓" }, { val: "18", label: "去过城市", icon: "🏙" },
                  { val: "134", label: "旅行天数", icon: "☀️" }, { val: "1.2k", label: "照片总数", icon: "📷" },
                ].map(s => (
                  <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: MUT, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Monthly bar chart */}
                <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: FG, marginBottom: 12 }}>📈 最近 12 个月记录频率</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70 }}>
                    {[2,3,1,4,2,5,3,2,4,3,1,2].map((v,i) => (
                      <div key={i} style={{ flex: 1, borderRadius: "4px 4px 0 0", background: i===6 ? P : `${P}35`, height: `${v/5*100}%` }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    {["1","2","3","4","5","6","7","8","9","10","11","12"].map(m => <span key={m} style={{ fontSize: 7, color: MUT }}>{m}</span>)}
                  </div>
                </div>

                {/* Top destinations */}
                <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: FG, marginBottom: 10 }}>🏆 最常去的目的地</div>
                  {topDests.map((d, i) => (
                    <div key={d.dest} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, width: 18, textAlign: "center" }}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: FG }}>{d.dest}</span>
                          <span style={{ fontSize: 10, color: MUT }}>{d.count} 篇</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 999, background: `${BOR}50`, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 999, background: P, width: `${d.count / topDests[0].count * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood distribution */}
              <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: FG, marginBottom: 10 }}>😊 旅途心情分布</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {moodCounts.map(m => (
                    <div key={m.mood} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: `${m.color}18`, border: `1px solid ${m.color}35`, color: m.color, fontSize: 12, fontWeight: 600 }}>
                      {m.mood}<span style={{ fontWeight: 700 }}>{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI recommendations */}
              <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: FG }}>🤖 AI 行程推荐</div>
                  <button style={{ fontSize: 10, padding: "3px 10px", borderRadius: 8, background: `${P}12`, color: P, fontWeight: 600, border: `1px solid ${P}25`, cursor: "pointer" }}>获取推荐</button>
                </div>
                <p style={{ fontSize: 10, color: MUT }}>基于你的旅行偏好，AI 将为你推荐下一个值得探索的目的地</p>
              </div>

              {/* Export & Print */}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, border: `1px solid ${BOR}`, background: CARD, fontSize: 12, fontWeight: 600, color: FG, cursor: "pointer" }}>
                  <Download style={{ width: 13, height: 13, color: P }} />导出数据（JSON）
                </button>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, border: `1px solid ${BOR}`, background: CARD, fontSize: 12, fontWeight: 600, color: FG, cursor: "pointer" }}>
                  <FileText style={{ width: 13, height: 13, color: MUT }} />打印旅行册
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
