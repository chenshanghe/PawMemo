import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Loader2, Trash2, Navigation, MapPin, Calendar, Users, ChevronRight, SlidersHorizontal, ArrowUpDown, Pencil } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { credentials: "include", ...init });
}

interface SavedPlan {
  id: number;
  title: string;
  summary: string | null;
  from: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  travelers: number;
  style: string | null;
  travelMode: string | null;
  budget: string | null;
  specialNeeds: string[] | null;
  groupType: string | null;
  createdAt: string;
  lastViewedAt: string | null;
}

const GROUP_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  solo:    { label: "🧍 独自",  cls: "bg-violet-50 text-violet-600" },
  couple:  { label: "💑 情侣",  cls: "bg-pink-50 text-pink-600" },
  family:  { label: "👨‍👩‍👧 家庭", cls: "bg-amber-50 text-amber-600" },
  friends: { label: "👫 朋友",  cls: "bg-teal-50 text-teal-600" },
};

type SortKey = "createdAt" | "lastViewedAt";
type GroupTypeKey = "solo" | "couple" | "family" | "friends";

const GROUP_TYPE_CHIPS: { key: GroupTypeKey; label: string; activeCls: string; inactiveCls: string }[] = [
  { key: "solo",    label: "🧍 独自",   activeCls: "bg-violet-500 text-white border-violet-500 shadow-sm", inactiveCls: "bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-400" },
  { key: "couple",  label: "💑 情侣",   activeCls: "bg-pink-500 text-white border-pink-500 shadow-sm",   inactiveCls: "bg-pink-50 text-pink-600 border-pink-200 hover:border-pink-400" },
  { key: "family",  label: "👨‍👩‍👧 家庭", activeCls: "bg-amber-500 text-white border-amber-500 shadow-sm", inactiveCls: "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400" },
  { key: "friends", label: "👫 朋友",   activeCls: "bg-teal-500 text-white border-teal-500 shadow-sm",   inactiveCls: "bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-400" },
];

const BUDGET_OPTIONS = ["经济实惠", "舒适中档", "豪华品质"];
const SPECIAL_NEEDS_OPTIONS = ["素食友好", "宠物友好", "无障碍设施"];
const TRAVEL_MODE_OPTIONS = ["自驾", "跟团", "背包", "高铁", "飞机"];
const TRAVELER_OPTIONS = ["1人", "2人", "3-5人", "6+人"];

function travelerBucket(n: number): string {
  if (n === 1) return "1人";
  if (n === 2) return "2人";
  if (n >= 3 && n <= 5) return "3-5人";
  return "6+人";
}

function budgetLabel(budget: string | null) {
  if (!budget) return null;
  return budget.split("（")[0];
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{label}</span>
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function groupByMonth(plans: SavedPlan[], sortKey: SortKey): { label: string; items: SavedPlan[] }[] {
  const map = new Map<string, SavedPlan[]>();
  for (const p of plans) {
    const dateStr = sortKey === "lastViewedAt" && p.lastViewedAt ? p.lastViewedAt : p.createdAt;
    const key = dateStr.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: key.replace("-", " 年 ") + " 月",
    items,
  }));
}

function useToggleSet(initial: Set<string> = new Set()) {
  const [set, setSet] = useState<Set<string>>(initial);
  const toggle = (v: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  return [set, toggle] as const;
}

export default function PlanListPage() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const [groupTypeFilter, setGroupTypeFilter] = useState<GroupTypeKey | null>(null);
  const [budgetFilter, toggleBudget] = useToggleSet();
  const [needsFilter, toggleNeeds] = useToggleSet();
  const [modeFilter, toggleMode] = useToggleSet();
  const [travelersFilter, toggleTravelers] = useToggleSet();

  useEffect(() => {
    apiFetch("/api/plan/saved")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPlans(data); setLoading(false); })
      .catch(() => { setError("加载失败，请刷新重试"); setLoading(false); });
  }, []);

  const activeFilterCount = (groupTypeFilter ? 1 : 0) + budgetFilter.size + needsFilter.size + modeFilter.size + travelersFilter.size;

  const clearAllFilters = () => {
    setGroupTypeFilter(null);
    [...budgetFilter].forEach(v => toggleBudget(v));
    [...needsFilter].forEach(v => toggleNeeds(v));
    [...modeFilter].forEach(v => toggleMode(v));
    [...travelersFilter].forEach(v => toggleTravelers(v));
  };

  const filteredPlans = useMemo(() => {
    const filtered = plans.filter(p => {
      if (groupTypeFilter && p.groupType !== groupTypeFilter) return false;
      if (budgetFilter.size > 0) {
        const label = budgetLabel(p.budget);
        if (!label || !budgetFilter.has(label)) return false;
      }
      if (needsFilter.size > 0) {
        const needs = p.specialNeeds ?? [];
        const hasAll = [...needsFilter].every(n => needs.includes(n));
        if (!hasAll) return false;
      }
      if (modeFilter.size > 0) {
        if (!p.travelMode || !modeFilter.has(p.travelMode)) return false;
      }
      if (travelersFilter.size > 0) {
        if (!travelersFilter.has(travelerBucket(p.travelers))) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "lastViewedAt") {
        const aDate = a.lastViewedAt ?? a.createdAt;
        const bDate = b.lastViewedAt ?? b.createdAt;
        return bDate.localeCompare(aDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [plans, groupTypeFilter, budgetFilter, needsFilter, modeFilter, travelersFilter, sortBy]);

  const handleRename = async (id: number) => {
    const trimmed = renameTitle.trim();
    if (!trimmed) { setRenamingId(null); setRenameTitle(""); return; }
    const oldTitle = plans.find(p => p.id === id)?.title ?? "";
    setPlans(prev => prev.map(p => p.id === id ? { ...p, title: trimmed } : p));
    setRenamingId(null);
    setRenameTitle("");
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) setPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
    } catch {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确认删除这份规划？")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`, { method: "DELETE" });
      if (res.ok) setPlans(prev => prev.filter(p => p.id !== id));
      else setError("删除失败");
    } catch {
      setError("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const nights = (p: SavedPlan) =>
    Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000);

  const groups = groupByMonth(filteredPlans, sortBy);

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">我的规划</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading
                ? "加载中…"
                : activeFilterCount > 0
                  ? `筛选结果 ${filteredPlans.length} / ${plans.length} 份`
                  : `共 ${plans.length} 份保存的行程`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && plans.length > 0 && (
              <>
                <button
                  onClick={() => setSortBy(v => v === "createdAt" ? "lastViewedAt" : "createdAt")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    sortBy === "lastViewedAt"
                      ? "bg-primary/8 border-primary/30 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                  title={sortBy === "createdAt" ? "当前：最新保存" : "当前：最近查看"}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === "createdAt" ? "最新保存" : "最近查看"}
                </button>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    showFilters || activeFilterCount > 0
                      ? "bg-primary/8 border-primary/30 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  筛选
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </>
            )}
            <Link href="/plan">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                <Navigation className="w-3.5 h-3.5" />新规划
              </button>
            </Link>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Group type chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0">出行类型</span>
              <button
                onClick={() => setGroupTypeFilter(null)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                  groupTypeFilter === null
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                全部
              </button>
              {GROUP_TYPE_CHIPS.map(({ key, label, activeCls, inactiveCls }) => (
                <button
                  key={key}
                  onClick={() => setGroupTypeFilter(prev => prev === key ? null : key)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                    groupTypeFilter === key ? activeCls : inactiveCls
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ChipGroup
              label="预算"
              options={BUDGET_OPTIONS}
              selected={budgetFilter}
              onToggle={toggleBudget}
            />
            <ChipGroup
              label="特殊需求"
              options={SPECIAL_NEEDS_OPTIONS}
              selected={needsFilter}
              onToggle={toggleNeeds}
            />
            <ChipGroup
              label="出行方式"
              options={TRAVEL_MODE_OPTIONS}
              selected={modeFilter}
              onToggle={toggleMode}
            />
            <ChipGroup
              label="出行人数"
              options={TRAVELER_OPTIONS}
              selected={travelersFilter}
              onToggle={toggleTravelers}
            />
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
              >
                清除全部筛选
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-card p-12 text-center space-y-4">
            <div className="text-4xl">🗺️</div>
            <div>
              <p className="text-base font-semibold text-foreground">还没有保存的规划</p>
              <p className="text-sm text-muted-foreground mt-1">使用 AI 规划功能生成行程，保存后在这里查看</p>
            </div>
            <Link href="/plan">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm mt-2">
                <Navigation className="w-4 h-4" />开始规划
              </button>
            </Link>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-card p-10 text-center space-y-3">
            <div className="text-3xl">🔍</div>
            <div>
              <p className="text-sm font-semibold text-foreground">没有符合条件的行程</p>
              <p className="text-xs text-muted-foreground mt-1">尝试调整筛选条件</p>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-xs text-primary hover:underline"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {group.label}
                </p>
                <div className="space-y-3">
                  {group.items.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setLocation(`/plan?load=${plan.id}`)}
                      className="group flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer relative"
                    >
                      <div className="w-1.5 rounded-full bg-gradient-to-b from-primary to-orange-400 self-stretch shrink-0 min-h-[48px]" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1 flex-1 min-w-0 group/title">
                            {renamingId === plan.id ? (
                              <input
                                autoFocus
                                className="text-sm font-semibold bg-transparent border-b border-primary outline-none flex-1 min-w-0 text-foreground"
                                value={renameTitle}
                                onChange={e => setRenameTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { e.preventDefault(); handleRename(plan.id); }
                                  if (e.key === "Escape") { setRenamingId(null); setRenameTitle(""); }
                                  e.stopPropagation();
                                }}
                                onClick={e => e.stopPropagation()}
                                onBlur={() => handleRename(plan.id)}
                              />
                            ) : (
                              <>
                                <h3
                                  className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug truncate cursor-text"
                                  title="点击重命名"
                                  onClick={e => { e.stopPropagation(); e.preventDefault(); setRenamingId(plan.id); setRenameTitle(plan.title); }}
                                >
                                  {plan.title}
                                </h3>
                                <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-40 transition-opacity shrink-0 text-muted-foreground" />
                              </>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
                        </div>

                        {plan.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {plan.summary}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {plan.from} → {plan.destinations.join("、")}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {plan.startDate.slice(0, 7)} · {nights(plan)} 晚
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {plan.travelers} 人
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {plan.groupType && GROUP_TYPE_BADGE[plan.groupType] && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${GROUP_TYPE_BADGE[plan.groupType].cls}`}>
                              {GROUP_TYPE_BADGE[plan.groupType].label}
                            </span>
                          )}
                          {plan.style && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium">
                              {plan.style}
                            </span>
                          )}
                          {plan.travelMode && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              {plan.travelMode}
                            </span>
                          )}
                          {plan.budget && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                              {budgetLabel(plan.budget)}
                            </span>
                          )}
                          {(plan.specialNeeds ?? []).map(need => (
                            <span key={need} className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(plan.id, e)}
                        disabled={deletingId === plan.id}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors opacity-0 group-hover:opacity-100"
                        title="删除"
                      >
                        {deletingId === plan.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
