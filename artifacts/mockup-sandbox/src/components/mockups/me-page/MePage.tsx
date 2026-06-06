import { useState } from "react";
import {
  Zap, Award, MessageSquare, Bell, BookText, Bookmark, Users,
  BarChart2, Camera, Pencil, LogOut, ChevronRight, Shield, FileText,
  Download, Trash2, AlertTriangle, Check, Settings2,
} from "lucide-react";

const AVATAR = "https://api.dicebear.com/9.x/adventurer/svg?seed=wantong&backgroundColor=ffdfbf";

const tabs = [
  { key: "notes", label: "笔记", icon: BookText, count: 9 },
  { key: "favorites", label: "收藏", icon: Bookmark },
  { key: "following", label: "关注", icon: Users, count: 1 },
  { key: "followers", label: "粉丝", icon: Users },
  { key: "data", label: "数据", icon: BarChart2 },
];

export function MePage() {
  const [tab, setTab] = useState("notes");
  const [digest, setDigest] = useState(true);

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans pb-10">

      {/* ── Cover ───────────────────────────────────────── */}
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c9826a] via-[#e4a882] to-[#f5c9a0]" />
        <div
          className="absolute inset-0 opacity-25 blur-2xl scale-110"
          style={{ background: `url(${AVATAR}) center/cover` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#faf8f5]/95 via-[#faf8f5]/20 to-transparent" />
        <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-medium text-[#5a3e2b] shadow-sm">
          <Pencil className="w-3 h-3" />
          编辑主页
        </button>
      </div>

      <div className="px-4 -mt-12 relative">

        {/* ── Avatar + name ───────────────────────────── */}
        <div className="flex items-end justify-between mb-3">
          <div className="relative">
            <div className="w-22 h-22 rounded-full ring-4 ring-[#faf8f5] bg-[#f0ddd3] overflow-hidden shadow-md" style={{ width: 88, height: 88 }}>
              <img src={AVATAR} alt="" className="w-full h-full object-cover" />
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#c9826a] text-white flex items-center justify-center shadow-sm border-2 border-[#faf8f5]">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Version badge */}
          <span className="flex items-center gap-1 text-[9px] text-[#b0907a]/60 mb-1 select-none">
            <Zap className="w-2.5 h-2.5" />
            2026.06.06
          </span>
        </div>

        {/* Name + tier + bio */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg font-bold text-[#2d1a0e] tracking-tight">顽童旅人</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pro</span>
        </div>
        <p className="text-[11px] text-[#8c6a55] mb-3 leading-relaxed">走过三山五岳，记录每一片云彩。</p>

        {/* ── Stats row ───────────────────────────────── */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "笔记", val: 9 },
            { label: "关注", val: 1 },
            { label: "粉丝", val: 12 },
          ].map(({ label, val }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-white/70 border border-[#e8d9d0]/60 shadow-sm">
              <span className="text-base font-bold text-[#2d1a0e]">{val}</span>
              <span className="text-[10px] text-[#8c6a55] mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Subscription card ───────────────────────── */}
        <div className="mb-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Pro 会员</p>
            <p className="text-[10px] text-amber-600/80">剩余 28 次 AI · 本月已用 12 次</p>
          </div>
          <span className="text-[10px] text-amber-700 font-medium">管理 →</span>
        </div>

        {/* ── Settings card ───────────────────────────── */}
        <div className="mb-3 rounded-2xl bg-white/70 border border-[#e8d9d0]/60 overflow-hidden shadow-sm divide-y divide-[#e8d9d0]/50">
          {/* Notifications */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#f5ece7] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#c9826a]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#2d1a0e]">消息通知</p>
              <p className="text-[10px] text-[#8c6a55]">互动、点赞、系统提醒</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#c9b5aa]/60" />
          </div>
          {/* Weekly digest toggle */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#f5ece7] flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4 text-[#c9826a]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#2d1a0e]">每周旅行周报</p>
              <p className="text-[10px] text-[#8c6a55]">每周邮件汇总旅行足迹</p>
            </div>
            <button
              onClick={() => setDigest(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${digest ? "bg-[#c9826a]" : "bg-[#e0d0c8]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${digest ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* ── Quick tiles (3-col) ──────────────────────── */}
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            { icon: Zap, label: "管理套餐", desc: "查看续费选项" },
            { icon: Award, label: "旅行成就", desc: "解锁专属勋章" },
            { icon: MessageSquare, label: "意见反馈", desc: "你的想法" },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/70 border border-[#e8d9d0]/60 shadow-sm hover:bg-[#fdf3ee] transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#f5ece7] flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#c9826a]" />
              </div>
              <p className="text-[11px] font-semibold text-[#2d1a0e] leading-tight">{label}</p>
              <p className="text-[9px] text-[#8c6a55] leading-tight text-center">{desc}</p>
            </button>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="mb-3 flex border-b border-[#e8d9d0]/60 overflow-x-auto -mx-4 px-4 gap-0.5 no-scrollbar">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-3 py-2.5 text-[11px] font-medium shrink-0 border-b-2 transition-colors ${
                tab === key
                  ? "border-[#c9826a] text-[#c9826a]"
                  : "border-transparent text-[#8c6a55] hover:text-[#5a3e2b]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count != null && (
                <span className="text-[9px] opacity-70">({count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab placeholder content */}
        {tab === "notes" && (
          <div className="space-y-2.5">
            {["东京三日漫游记", "成都小吃地图", "云南摄影之旅"].map((title, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/70 border border-[#e8d9d0]/50">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#f0ddd3] to-[#e4a882] shrink-0" />
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-xs font-semibold text-[#2d1a0e] mb-1">{title}</p>
                  <p className="text-[10px] text-[#8c6a55] line-clamp-2 leading-relaxed">记录了旅途中最美的瞬间和难忘的美食体验...</p>
                  <p className="text-[9px] text-[#b0907a]/60 mt-1">2026.05.{10 + i * 5}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab !== "notes" && (
          <div className="flex flex-col items-center py-12 text-[#b0907a]/60">
            <BookText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-xs">暂无内容</p>
          </div>
        )}

        {/* ── Account & Privacy (softened) ────────────── */}
        <div className="mt-4 rounded-2xl bg-white/70 border border-[#e8d9d0]/60 overflow-hidden shadow-sm divide-y divide-[#e8d9d0]/50">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#fdf3ee]/60">
            <Shield className="w-3.5 h-3.5 text-[#c9826a]/70" />
            <span className="text-[11px] font-semibold text-[#5a3e2b]">账号与数据</span>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fdf3ee] transition-colors text-left">
            <div className="w-7 h-7 rounded-full bg-[#f5ece7] flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 text-[#c9826a]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#2d1a0e]">导出我的数据</p>
              <p className="text-[10px] text-[#8c6a55]">下载所有旅记数据（JSON 格式）</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#c9b5aa]/60" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50/60 transition-colors text-left group">
            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-500">注销账号</p>
              <p className="text-[10px] text-red-400/70">删除所有数据，此操作不可撤销</p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300/60" />
          </button>
        </div>

        {/* ── Legal footer links ───────────────────────── */}
        <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
          <a href="#" className="text-[10px] text-[#b0907a]/60 hover:text-[#8c6a55] transition-colors">隐私政策</a>
          <span className="text-[10px] text-[#b0907a]/40">·</span>
          <a href="#" className="text-[10px] text-[#b0907a]/60 hover:text-[#8c6a55] transition-colors">用户协议</a>
          <span className="text-[10px] text-[#b0907a]/40">·</span>
          <button className="flex items-center gap-1 text-[10px] text-[#b0907a]/60 hover:text-[#8c6a55] transition-colors">
            <LogOut className="w-2.5 h-2.5" />
            退出登录
          </button>
        </div>

      </div>
    </div>
  );
}
