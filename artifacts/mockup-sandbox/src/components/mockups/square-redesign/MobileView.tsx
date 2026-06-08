import React, { useState } from "react";
import { MapPin, Heart, MessageCircle, RefreshCw, Bookmark, CalendarDays } from "lucide-react";

const P = "#D96C47";
const FG = "#2A1A0A";
const MUT = "#8C7060";
const BOR = "#D9CFC0";
const CARD = "#FDFAF5";
const BG = "#F5F0E8";

const MOODS: Record<string, { bg: string; color: string }> = {
  开心: { bg: "#FEF9C3", color: "#A16207" },
  平静: { bg: "#DBEAFE", color: "#1D4ED8" },
  感动: { bg: "#FCE7F3", color: "#BE185D" },
  兴奋: { bg: "#FFEDD5", color: "#C2410C" },
  思念: { bg: "#EDE9FE", color: "#7C3AED" },
};

const TAGS = ["亲子游", "海边", "城市漫步", "美食探店", "历史文化", "自驾"];

const ENTRIES = [
  {
    id: 1,
    title: "初夏京都，在苔藓与金阁之间慢慢流连",
    destination: "京都",
    startDate: "2025-06-01",
    days: 6,
    mood: "平静",
    content: "细雨打湿了石板路，岚山竹林的每一节竹都在轻轻颤动。我第一次明白为什么那么多人愿意一再回到这座城市……",
    likeCount: 128,
    commentCount: 34,
    coverUrl: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=80",
    favorited: false,
    tags: [{ id: 1, name: "历史文化" }, { id: 2, name: "城市漫步" }],
    author: { name: "竹马若晴", initials: "竹" },
  },
  {
    id: 2,
    title: "带娃去海南·三亚七天六晚全攻略",
    destination: "三亚",
    startDate: "2025-05-15",
    days: 7,
    mood: "开心",
    content: "孩子第一次见到这么蓝的海，脱了鞋就冲进去了。酒店性价比超高，早餐种类让大人都馋得停不下来……",
    likeCount: 256,
    commentCount: 61,
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    favorited: true,
    tags: [{ id: 3, name: "亲子游" }, { id: 4, name: "海边" }],
    author: { name: "阳光下的贝壳", initials: "阳" },
  },
  {
    id: 3,
    title: "成都两日：火锅、宽窄巷子与慢生活",
    destination: "成都",
    startDate: "2025-04-22",
    days: 2,
    mood: "兴奋",
    content: "来成都之前我低估了这座城市的能量——它不是那种让你疲惫的快城市，而是一种让你沉溺的慢悠悠……",
    likeCount: 89,
    commentCount: 17,
    coverUrl: "https://images.unsplash.com/photo-1548011705-6e01e7f67a17?w=600&q=80",
    favorited: false,
    tags: [{ id: 5, name: "美食探店" }, { id: 6, name: "城市漫步" }],
    author: { name: "辣椒先生", initials: "辣" },
  },
];

export default function MobileView() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [favs, setFavs] = useState<Record<number, boolean>>({ 2: true });
  const [likes, setLikes] = useState<Record<number, { count: number; liked: boolean }>>({
    1: { count: 128, liked: false },
    2: { count: 256, liked: true },
    3: { count: 89, liked: false },
  });

  return (
    <div style={{ width: 390, minHeight: 844, background: BG, fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif", overflowX: "hidden" }}>

      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", paddingTop: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: FG }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["▲▲▲", "WiFi", "🔋"].map((s, i) => (
            <span key={i} style={{ fontSize: 10, color: FG, opacity: 0.5 }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 8 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: FG, fontFamily: "Georgia, serif", margin: 0, letterSpacing: "-0.5px" }}>旅行广场</h1>
            <p style={{ fontSize: 12, color: MUT, margin: "3px 0 0", fontWeight: 400 }}>发现旅行者的精彩瞬间</p>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: CARD, border: `1px solid ${BOR}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,.06)", cursor: "pointer" }}>
            <RefreshCw size={15} color={MUT} />
          </button>
        </div>

        {/* ── Tag filter pills ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginLeft: -16, paddingLeft: 16, paddingRight: 16, marginRight: -16 }}>
          {["全部", ...TAGS.slice(0, 5)].map((tag) => {
            const isAll = tag === "全部";
            const key = isAll ? null : tag;
            const active = activeTag === key;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(active ? null : key)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  border: `1.5px solid ${active ? P : BOR}`,
                  background: active ? P : CARD,
                  color: active ? "#fff" : MUT,
                  transition: "all .15s",
                  boxShadow: active ? "0 2px 6px rgba(217,108,71,.25)" : "none",
                }}
              >
                {isAll ? "全部" : `#${tag}`}
              </button>
            );
          })}
        </div>

        {/* ── Entry cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ENTRIES.map((entry) => {
            const moodStyle = MOODS[entry.mood] ?? { bg: "#F3F4F6", color: "#6B7280" };
            const likeData = likes[entry.id];
            const isFav = favs[entry.id];
            return (
              <div key={entry.id} style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 10px rgba(42,26,10,.06)" }}>

                {/* Cover image */}
                <div style={{ position: "relative", height: 200, overflow: "hidden", flexShrink: 0 }}>
                  <img src={entry.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {/* Gradient overlay */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.52) 0%, rgba(0,0,0,.08) 45%, transparent 70%)" }} />

                  {/* Mood badge — top right */}
                  <div style={{ position: "absolute", top: 10, right: 44, padding: "3px 10px", borderRadius: 999, background: moodStyle.bg, color: moodStyle.color, fontSize: 11, fontWeight: 600 }}>
                    {entry.mood}
                  </div>

                  {/* Bookmark — top right corner */}
                  <button
                    onClick={() => setFavs(f => ({ ...f, [entry.id]: !f[entry.id] }))}
                    style={{
                      position: "absolute", top: 8, right: 10,
                      width: 30, height: 30, borderRadius: 999,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isFav ? "rgba(251,191,36,.9)" : "rgba(0,0,0,.28)",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    <Bookmark size={14} fill={isFav ? "#D97706" : "none"} color={isFav ? "#D97706" : "white"} />
                  </button>

                  {/* Location pill — bottom left */}
                  <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.42)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "4px 10px" }}>
                    <MapPin size={11} color="rgba(255,255,255,.85)" />
                    <span style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{entry.destination}</span>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Title */}
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {entry.title}
                  </h3>

                  {/* Date + days */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <CalendarDays size={11} color={MUT} />
                    <span style={{ fontSize: 11, color: MUT }}>
                      {entry.startDate.replace(/-/g, ".")} · {entry.days} 天
                    </span>
                  </div>

                  {/* Content snippet — italic quote */}
                  {entry.content && (
                    <p style={{ margin: 0, fontSize: 12, color: MUT, lineHeight: 1.65, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", borderLeft: `2px solid ${BOR}`, paddingLeft: 8 }}>
                      "{entry.content}"
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {entry.tags.map(t => (
                        <span key={t.id} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(217,108,71,.1)", color: P, fontSize: 10, fontWeight: 600 }}>
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer: author + stats + read */}
                  <div style={{ borderTop: `1px solid ${BOR}`, paddingTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Author avatar */}
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: "rgba(217,108,71,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: P }}>{entry.author.initials}</span>
                    </div>
                    <span style={{ fontSize: 11, color: MUT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.author.name}</span>

                    {/* Likes */}
                    <button
                      onClick={() => setLikes(l => ({
                        ...l,
                        [entry.id]: { count: l[entry.id].liked ? l[entry.id].count - 1 : l[entry.id].count + 1, liked: !l[entry.id].liked },
                      }))}
                      style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <Heart size={13} fill={likeData.liked ? "#EF4444" : "none"} color={likeData.liked ? "#EF4444" : MUT} />
                      <span style={{ fontSize: 11, color: likeData.liked ? "#EF4444" : MUT }}>{likeData.count}</span>
                    </button>

                    {/* Comments */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <MessageCircle size={13} color={MUT} />
                      <span style={{ fontSize: 11, color: MUT }}>{entry.commentCount}</span>
                    </div>

                    {/* Read link */}
                    <span style={{ fontSize: 11, color: P, fontWeight: 700, marginLeft: 2 }}>阅读 →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom nav placeholder */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 80, background: CARD, borderTop: `1px solid ${BOR}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 16px 16px" }}>
        {[{ icon: "🏠", label: "主页" }, { icon: "📖", label: "旅记", active: false }, { icon: "🗺️", label: "地图" }, { icon: "🌐", label: "广场", active: true }, { icon: "👤", label: "我的" }].map((item) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: item.active ? P : MUT, fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
