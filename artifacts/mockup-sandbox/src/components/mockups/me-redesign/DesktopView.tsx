import React, { useState } from "react";
import {
  Pencil, Camera, Bookmark, BookText, BarChart2,
  MapPin, CalendarDays, Sparkles, Award, MessageSquare,
  LogOut, ChevronRight, Trash2, FileText, Bell,
  Plus, Download, Receipt, Map, Zap, Users,
} from "lucide-react";

const P = "#D96C47";
const FG = "#2A1A0A";
const MUT = "#8C7060";
const BOR = "#D9CFC0";
const BG = "#F5F0E8";
const CARD = "#FDFAF5";

type Tab = "notes" | "favorites" | "plans" | "data";

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

const MOOD_COLOR: Record<string, string> = {
  感动: "#FDE8F0", 兴奋: "#FEE2E2", 平静: "#DBEAFE", 开心: "#FEF9C3", 疲惫: "#F3F4F6", 思念: "#EDE9FE",
};

export default function DesktopView() {
  const [tab, setTab] = useState<Tab>("plans");

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "notes",     label: "旅记", icon: <BookText className="w-3.5 h-3.5" />, count: 23 },
    { key: "favorites", label: "收藏", icon: <Bookmark className="w-3.5 h-3.5" /> },
    { key: "plans",     label: "规划", icon: <Map className="w-3.5 h-3.5" />, count: 3 },
    { key: "data",      label: "数据", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Top header bar */}
      <div style={{ borderBottom: `1px solid ${BOR}60`, background: `${CARD}cc`, backdropFilter: "blur(8px)", padding: "0 40px", display: "flex", alignItems: "center", height: 52 }}>
        <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "Georgia, serif", color: FG }}>我的</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Profile card */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 20, overflow: "hidden" }}>
            {/* Cover */}
            <div style={{ height: 88, background: `linear-gradient(135deg, ${P}88 0%, #F4A261 60%, #FBD28A 100%)`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(253,250,245,.7))" }} />
            </div>
            <div style={{ padding: "0 20px 20px", marginTop: -36 }}>
              {/* Avatar row */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${P}33, #FBD28A55)`, border: `3px solid ${CARD}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: P, boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>旅</div>
                  <div style={{ position: "absolute", bottom: -1, right: -2, width: 22, height: 22, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera style={{ width: 11, height: 11, color: "#fff" }} />
                  </div>
                </div>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, border: `1px solid ${BOR}`, background: BG, fontSize: 11, fontWeight: 600, color: FG, cursor: "pointer" }}>
                  <Pencil style={{ width: 10, height: 10 }} />编辑
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif", color: FG }}>旅行者小明</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: `${P}18`, color: P }}>Pro</span>
              </div>
              <p style={{ fontSize: 10, color: MUT, marginTop: 2 }}>旅行号：user_abc123</p>
              <p style={{ fontSize: 12, color: `${FG}cc`, marginTop: 6, lineHeight: 1.6 }}>热爱探索世界每个角落，用镜头记录美好瞬间 🌏</p>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 12 }}>
                {[
                  { val: 23, label: "旅记" }, { val: 18, label: "城市" },
                  { val: 42, label: "关注" }, { val: 117, label: "粉丝" },
                ].map(s => (
                  <div key={s.label} style={{ background: BG, border: `1px solid ${BOR}50`, borderRadius: 10, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: MUT, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI usage card */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Sparkles style={{ width: 13, height: 13, color: P }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: FG }}>AI 叙事用量</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: MUT }}>3 / 5 次</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: `${BOR}60`, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", borderRadius: 999, background: P }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button style={{ flex: 1, padding: "6px 0", borderRadius: 8, background: P, color: "#fff", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer" }}>升级 · ¥28/月</button>
              <button style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", fontSize: 10, color: MUT, cursor: "pointer" }}>对比套餐</button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "6px 8px" }}>
            {[
              { icon: <Award style={{ width: 13, height: 13, color: P }} />, label: "旅行成就", sub: "解锁专属旅行勋章" },
              { icon: <Bell style={{ width: 13, height: 13, color: P }} />, label: "消息通知", sub: "评论与互动提醒" },
              { icon: <FileText style={{ width: 13, height: 13, color: P }} />, label: "每周旅行回顾", sub: "邮件摘要订阅" },
              { icon: <Receipt style={{ width: 13, height: 13, color: P }} />, label: "支付记录", sub: "历史订单与发票" },
              { icon: <Download style={{ width: 13, height: 13, color: P }} />, label: "导出数据", sub: "备份全部旅行日记" },
              { icon: <MessageSquare style={{ width: 13, height: 13, color: P }} />, label: "意见反馈", sub: "告诉我们你的想法" },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderBottom: i < arr.length - 1 ? `1px solid ${BOR}40` : "none", cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${P}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FG }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: MUT }}>{item.sub}</div>
                </div>
                <ChevronRight style={{ width: 13, height: 13, color: BOR, flexShrink: 0 }} />
              </div>
            ))}
          </div>

          {/* Sign out */}
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "none", background: "#FEF2F2", cursor: "pointer", width: "100%" }}>
            <LogOut style={{ width: 14, height: 14, color: "#EF4444" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>退出登录</span>
          </button>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${BOR}60`, paddingBottom: 0 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "8px 16px",
                  fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? P : MUT,
                  borderBottom: tab === t.key ? `2px solid ${P}` : "2px solid transparent",
                  background: "transparent", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid",
                  borderBottomColor: tab === t.key ? P : "transparent",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {t.icon}{t.label}
                {t.count != null && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: tab === t.key ? `${P}18` : `${BOR}60`, color: tab === t.key ? P : MUT }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Notes tab */}
          {tab === "notes" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {mockNotes.map(n => (
                <div key={n.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer" }}>
                  <div style={{ height: 120, background: `linear-gradient(135deg, ${P}22, #FBD28A33)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, position: "relative" }}>
                    🌍
                    <div style={{ position: "absolute", top: 8, right: 8, padding: "2px 7px", borderRadius: 999, background: `${MOOD_COLOR[n.mood]}cc`, fontSize: 9, color: FG + "bb" }}>{n.mood}</div>
                    <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,.35)", borderRadius: 6, padding: "2px 7px" }}>
                      <MapPin style={{ width: 9, height: 9, color: "#fff" }} />
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{n.dest}</span>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", marginBottom: 5 }}>{n.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: MUT }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><CalendarDays style={{ width: 9, height: 9 }} />{n.date.slice(0, 7)}</span>
                      <span style={{ padding: "1px 5px", borderRadius: 4, background: n.vis === "public" ? "#D1FAE5" : "#F3F4F6", color: n.vis === "public" ? "#059669" : "#6B7280" }}>{n.vis === "public" ? "公开" : "私密"}</span>
                      <span style={{ marginLeft: "auto" }}>{n.photos} 帧</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Plans tab */}
          {tab === "plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* New plan CTA */}
              <div style={{ background: `linear-gradient(135deg, ${P}15, #FBD28A18)`, border: `1px solid ${P}30`, borderRadius: 18, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: P, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${P}50` }}>
                  <Plus style={{ width: 22, height: 22, color: "#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: FG, marginBottom: 2 }}>新建 AI 旅行规划</div>
                  <div style={{ fontSize: 11, color: MUT }}>输入目的地，AI 自动生成逐日行程、餐厅推荐与订票链接</div>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: P, flexShrink: 0 }} />
              </div>

              <p style={{ fontSize: 11, color: MUT, padding: "2px 0" }}>已保存的规划 · {mockPlans.length} 份</p>

              {mockPlans.map(p => (
                <div key={p.id} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${P}18, #FBD28A28)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✈️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: MUT, marginBottom: 6 }}>{p.from} → {p.dests.join("、")} · {p.nights} 晚 · {p.date}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
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

          {/* Favorites tab */}
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

          {/* Data tab */}
          {tab === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { val: "23", label: "旅记总数", icon: "📓" },
                  { val: "18", label: "去过城市", icon: "🏙" },
                  { val: "134", label: "旅行天数", icon: "☀️" },
                  { val: "1,240", label: "照片总数", icon: "📷" },
                ].map(s => (
                  <div key={s.label} style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: FG, fontFamily: "Georgia, serif" }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: MUT, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Bar chart placeholder */}
              <div style={{ background: CARD, border: `1px solid ${BOR}60`, borderRadius: 16, padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: FG, marginBottom: 14 }}>月度记录趋势</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                  {[2, 3, 1, 4, 2, 5, 3, 2, 4, 3, 1, 2].map((v, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: "4px 4px 0 0", background: i === 6 ? P : `${P}35`, height: `${v / 5 * 100}%`, transition: "all .2s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"].map(m => (
                    <span key={m} style={{ fontSize: 8, color: MUT }}>{m.replace("月","")}</span>
                  ))}
                </div>
              </div>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 12, border: `1px solid ${BOR}`, background: CARD, fontSize: 12, fontWeight: 600, color: FG, cursor: "pointer" }}>
                <Download style={{ width: 14, height: 14, color: P }} />
                导出全部旅行数据
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
