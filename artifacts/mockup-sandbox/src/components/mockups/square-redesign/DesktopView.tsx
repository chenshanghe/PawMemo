import React, { useState } from "react";
import { MapPin, Heart, MessageCircle, RefreshCw, Bookmark, CalendarDays, TrendingUp } from "lucide-react";

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

const TAGS = ["全部", "亲子游", "海边", "城市漫步", "美食探店", "历史文化", "自驾"];

const ENTRIES = [
  {
    id: 1,
    title: "初夏京都，在苔藓与金阁之间慢慢流连",
    destination: "京都",
    startDate: "2025.06.01",
    days: 6,
    mood: "平静",
    content: "细雨打湿了石板路，岚山竹林的每一节竹都在轻轻颤动。我第一次明白为什么那么多人愿意一再回到这座城市……",
    likeCount: 128,
    commentCount: 34,
    coverUrl: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
    favorited: false,
    tags: [{ id: 1, name: "历史文化" }, { id: 2, name: "城市漫步" }],
    author: { name: "竹马若晴", initials: "竹" },
  },
  {
    id: 2,
    title: "带娃去海南·三亚七天六晚全攻略",
    destination: "三亚",
    startDate: "2025.05.15",
    days: 7,
    mood: "开心",
    content: "孩子第一次见到这么蓝的海，脱了鞋就冲进去了。酒店性价比超高，早餐种类让大人都馋得停不下来……",
    likeCount: 256,
    commentCount: 61,
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    favorited: true,
    tags: [{ id: 3, name: "亲子游" }, { id: 4, name: "海边" }],
    author: { name: "阳光下的贝壳", initials: "阳" },
  },
  {
    id: 3,
    title: "成都两日：火锅、宽窄巷子与慢生活",
    destination: "成都",
    startDate: "2025.04.22",
    days: 2,
    mood: "兴奋",
    content: "来成都之前我低估了这座城市的能量——它不是那种让你疲惫的快城市，而是一种让你沉溺的慢悠悠……",
    likeCount: 89,
    commentCount: 17,
    coverUrl: "https://images.unsplash.com/photo-1548011705-6e01e7f67a17?w=800&q=80",
    favorited: false,
    tags: [{ id: 5, name: "美食探店" }, { id: 6, name: "城市漫步" }],
    author: { name: "辣椒先生", initials: "辣" },
  },
  {
    id: 4,
    title: "北海道冬日：在雪国泡汤看星星的奇妙体验",
    destination: "北海道",
    startDate: "2025.01.10",
    days: 5,
    mood: "感动",
    content: "零下二十度的夜晚，露天温泉热气腾腾，抬头就是银河。这种反差感让我久久无法言说……",
    likeCount: 312,
    commentCount: 78,
    coverUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    favorited: false,
    tags: [{ id: 7, name: "温泉" }, { id: 8, name: "自驾" }],
    author: { name: "雪国旅人", initials: "雪" },
  },
];

function EntryCard({ entry, favs, likes, setFavs, setLikes, activeTag, onTagClick }: any) {
  const moodStyle = MOODS[entry.mood] ?? { bg: "#F3F4F6", color: "#6B7280" };
  const likeData = likes[entry.id];
  const isFav = favs[entry.id];

  return (
    <div style={{ background: CARD, border: `1px solid ${BOR}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(42,26,10,.07)", display: "flex", flexDirection: "column", cursor: "pointer", transition: "box-shadow .2s" }}>

      {/* Cover */}
      <div style={{ position: "relative", height: 195, overflow: "hidden", flexShrink: 0 }}>
        <img src={entry.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .5s" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.05) 50%, transparent 75%)" }} />

        {/* Mood — top right, before bookmark */}
        <div style={{ position: "absolute", top: 10, right: 46, padding: "3px 10px", borderRadius: 999, background: moodStyle.bg, color: moodStyle.color, fontSize: 11, fontWeight: 600 }}>
          {entry.mood}
        </div>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); setFavs((f: any) => ({ ...f, [entry.id]: !f[entry.id] })); }}
          style={{ position: "absolute", top: 8, right: 10, width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: isFav ? "rgba(251,191,36,.9)" : "rgba(0,0,0,.28)", border: "none", cursor: "pointer" }}
        >
          <Bookmark size={14} fill={isFav ? "#D97706" : "none"} color={isFav ? "#D97706" : "white"} />
        </button>

        {/* Location */}
        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.42)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "4px 10px" }}>
          <MapPin size={11} color="rgba(255,255,255,.85)" />
          <span style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{entry.destination}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: FG, fontFamily: "Georgia, serif", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {entry.title}
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <CalendarDays size={10} color={MUT} />
          <span style={{ fontSize: 11, color: MUT }}>{entry.startDate} · {entry.days} 天</span>
        </div>

        {entry.content && (
          <p style={{ margin: 0, fontSize: 11.5, color: MUT, lineHeight: 1.65, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", borderLeft: `2px solid ${BOR}`, paddingLeft: 8 }}>
            "{entry.content}"
          </p>
        )}

        {entry.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {entry.tags.map((t: any) => (
              <button key={t.id} onClick={(e) => { e.stopPropagation(); onTagClick(t.name); }} style={{ padding: "2px 8px", borderRadius: 6, background: activeTag === t.name ? "rgba(217,108,71,.18)" : "rgba(217,108,71,.08)", color: P, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer" }}>
                #{t.name}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${BOR}`, paddingTop: 10, marginTop: "auto", display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(217,108,71,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: P }}>{entry.author.initials}</span>
          </div>
          <span style={{ fontSize: 11, color: MUT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.author.name}</span>

          <button onClick={(e) => { e.stopPropagation(); setLikes((l: any) => ({ ...l, [entry.id]: { count: l[entry.id].liked ? l[entry.id].count - 1 : l[entry.id].count + 1, liked: !l[entry.id].liked } })); }} style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Heart size={12} fill={likeData.liked ? "#EF4444" : "none"} color={likeData.liked ? "#EF4444" : MUT} />
            <span style={{ fontSize: 11, color: likeData.liked ? "#EF4444" : MUT }}>{likeData.count}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <MessageCircle size={12} color={MUT} />
            <span style={{ fontSize: 11, color: MUT }}>{entry.commentCount}</span>
          </div>

          <span style={{ fontSize: 11, color: P, fontWeight: 700 }}>阅读 →</span>
        </div>
      </div>
    </div>
  );
}

export default function DesktopView() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [favs, setFavs] = useState<Record<number, boolean>>({ 2: true });
  const [likes, setLikes] = useState<Record<number, { count: number; liked: boolean }>>({
    1: { count: 128, liked: false },
    2: { count: 256, liked: true },
    3: { count: 89, liked: false },
    4: { count: 312, liked: false },
  });

  return (
    <div style={{ width: 1280, minHeight: 900, background: BG, fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif", display: "flex" }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${BOR}`, padding: "32px 20px", display: "flex", flexDirection: "column", gap: 32, background: CARD }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, fontFamily: "Georgia, serif", color: FG, letterSpacing: "-0.5px" }}>旅行广场</h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: MUT }}>发现旅行者的精彩瞬间</p>
        </div>

        {/* Tag list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={13} color={MUT} />
            <span style={{ fontSize: 11, fontWeight: 600, color: MUT, textTransform: "uppercase", letterSpacing: "0.5px" }}>热门标签</span>
          </div>
          {TAGS.map((tag) => {
            const isAll = tag === "全部";
            const key = isAll ? null : tag;
            const active = activeTag === key;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(active ? null : key)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 10, fontSize: 13, fontWeight: active ? 700 : 400,
                  cursor: "pointer", border: "none", textAlign: "left",
                  background: active ? "rgba(217,108,71,.12)" : "transparent",
                  color: active ? P : MUT,
                  transition: "all .15s",
                }}
              >
                <span>{isAll ? "全部" : `#${tag}`}</span>
                {active && <span style={{ width: 6, height: 6, borderRadius: 999, background: P, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ marginTop: "auto", padding: "14px 12px", background: "rgba(217,108,71,.08)", borderRadius: 14, border: `1px solid rgba(217,108,71,.15)` }}>
          <p style={{ margin: 0, fontSize: 11, color: MUT, fontWeight: 600, marginBottom: 10 }}>广场统计</p>
          {[{ label: "公开旅记", value: "1,284" }, { label: "旅行达人", value: "376" }, { label: "本周新增", value: "58" }].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: MUT }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: FG }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: "32px 32px 60px", overflow: "auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: MUT }}>
              {activeTag ? `#${activeTag} · ` : ""}共 <strong style={{ color: FG }}>1,284</strong> 篇旅记
            </p>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: CARD, border: `1px solid ${BOR}`, fontSize: 12, color: MUT, cursor: "pointer", fontWeight: 500 }}>
            <RefreshCw size={13} color={MUT} />
            刷新
          </button>
        </div>

        {/* Mobile tag pills (hidden on desktop — shown in sidebar instead) */}

        {/* 2-column card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {ENTRIES.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              favs={favs}
              likes={likes}
              setFavs={setFavs}
              setLikes={setLikes}
              activeTag={activeTag}
              onTagClick={(tag: string) => setActiveTag(activeTag === tag ? null : tag)}
            />
          ))}
        </div>

        {/* Load more hint */}
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <span style={{ fontSize: 12, color: MUT, opacity: 0.5 }}>— 上拉加载更多 —</span>
        </div>
      </div>
    </div>
  );
}
