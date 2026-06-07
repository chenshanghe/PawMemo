import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, Trash2, Navigation, MapPin, Calendar, Users, ChevronRight, SlidersHorizontal, ArrowUpDown, Pencil, Copy, Check, RotateCcw } from "lucide-react";

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

type SortKey = "createdAt" | "lastViewedAt" | "leastViewed";
type GroupTypeKey = "solo" | "couple" | "family" | "friends";

const GROUP_TYPE_CHIPS: { key: GroupTypeKey; label: string; shortLabel: string; activeCls: string; inactiveCls: string }[] = [
  { key: "solo",    label: "🧍 独自",   shortLabel: "独自",  activeCls: "bg-violet-500 text-white border-violet-500 shadow-sm", inactiveCls: "bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-400" },
  { key: "couple",  label: "💑 情侣",   shortLabel: "情侣",  activeCls: "bg-pink-500 text-white border-pink-500 shadow-sm",   inactiveCls: "bg-pink-50 text-pink-600 border-pink-200 hover:border-pink-400" },
  { key: "family",  label: "👨‍👩‍👧 家庭", shortLabel: "家庭",  activeCls: "bg-amber-500 text-white border-amber-500 shadow-sm", inactiveCls: "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400" },
  { key: "friends", label: "👫 朋友",   shortLabel: "朋友",  activeCls: "bg-teal-500 text-white border-teal-500 shadow-sm",   inactiveCls: "bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-400" },
];

const BUDGET_OPTIONS = ["经济实惠", "舒适中档", "豪华品质"];
const SPECIAL_NEEDS_OPTIONS = ["素食友好", "宠物友好", "无障碍设施"];
const TRAVEL_MODE_OPTIONS = ["自驾", "跟团", "背包", "高铁", "飞机"];
const TRAVELER_OPTIONS = ["1人", "2人", "3-5人", "6+人"];
const STYLE_OPTIONS = ["文化探索", "美食之旅", "自然风光", "亲子游", "休闲放松"];

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

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} 周前`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} 个月前`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} 年前`;
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  counts,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Map<string, number>;
}) {
  const hasDisabled = counts
    ? options.some(opt => counts.get(opt) === 0 && !selected.has(opt))
    : false;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{label}</span>
        {options.map((opt) => {
          const active = selected.has(opt);
          const count = counts?.get(opt);
          const isZero = count === 0 && !active;
          return (
            <button
              key={opt}
              onClick={() => { if (!isZero) onToggle(opt); }}
              disabled={isZero}
              aria-label={isZero ? `${opt}（暂无匹配结果）` : undefined}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : isZero
                    ? "bg-background text-muted-foreground/35 border-border/30 cursor-not-allowed"
                    : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {opt}{count !== undefined ? <span className={`ml-1 ${active ? "opacity-70" : isZero ? "opacity-50" : "opacity-60"}`}>({count})</span> : null}
            </button>
          );
        })}
      </div>
      {hasDisabled && (
        <p className="text-[10px] text-muted-foreground/50 pl-1 italic">灰色选项与当前筛选无匹配</p>
      )}
    </div>
  );
}

function groupByMonth(plans: SavedPlan[], sortKey: SortKey): { label: string; items: SavedPlan[] }[] {
  const map = new Map<string, SavedPlan[]>();
  for (const p of plans) {
    const dateStr =
      (sortKey === "lastViewedAt" || sortKey === "leastViewed") && p.lastViewedAt
        ? p.lastViewedAt
        : p.createdAt;
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
  const searchStr = useSearch();

  // Parse URL params once on mount to seed initial filter state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urlParams = useMemo(() => new URLSearchParams(searchStr), []);

  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    try {
      const stored = localStorage.getItem("planListSortBy");
      if (stored === "lastViewedAt") return "lastViewedAt";
      if (stored === "leastViewed") return "leastViewed";
      return "createdAt";
    } catch {
      return "createdAt";
    }
  });
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [flashRenamedId, setFlashRenamedId] = useState<number | null>(null);
  const [flashRenameErrorId, setFlashRenameErrorId] = useState<number | null>(null);
  const [fadingRenamedId, setFadingRenamedId] = useState<number | null>(null);
  const [fadingRenameErrorId, setFadingRenameErrorId] = useState<number | null>(null);
  const [copyLinkToast, setCopyLinkToast] = useState(false);

  const [groupTypeFilter, toggleGroupType] = useToggleSet(
    new Set<string>(urlParams.getAll("groupType").flatMap(v => v ? v.split(",") : []))
  );
  const [budgetFilter, toggleBudget] = useToggleSet(
    new Set(urlParams.getAll("budget").flatMap(v => v ? v.split(",") : []))
  );
  const [needsFilter, toggleNeeds] = useToggleSet(
    new Set(urlParams.getAll("needs").flatMap(v => v ? v.split(",") : []))
  );
  const [modeFilter, toggleMode] = useToggleSet(
    new Set(urlParams.getAll("mode").flatMap(v => v ? v.split(",") : []))
  );
  const [travelersFilter, toggleTravelers] = useToggleSet(
    new Set(urlParams.getAll("travelers").flatMap(v => v ? v.split(",") : []))
  );
  const [styleFilter, toggleStyle] = useToggleSet(
    new Set(urlParams.getAll("style").flatMap(v => v ? v.split(",") : []))
  );

  const hasInitialFilters =
    urlParams.has("groupType") || urlParams.has("budget") ||
    urlParams.has("needs") || urlParams.has("mode") || urlParams.has("travelers") ||
    urlParams.has("style");
  const [showFilters, setShowFilters] = useState(() => {
    if (hasInitialFilters) return true;
    try {
      const stored = localStorage.getItem("planListFilterOpen");
      if (stored !== null) return stored === "true";
    } catch { /* ignore */ }
    return false;
  });

  // Sync active filters back to the URL so they survive navigation
  useEffect(() => {
    const params = new URLSearchParams();
    if (groupTypeFilter.size > 0) params.set("groupType", [...groupTypeFilter].join(","));
    if (budgetFilter.size > 0) params.set("budget", [...budgetFilter].join(","));
    if (needsFilter.size > 0) params.set("needs", [...needsFilter].join(","));
    if (modeFilter.size > 0) params.set("mode", [...modeFilter].join(","));
    if (travelersFilter.size > 0) params.set("travelers", [...travelersFilter].join(","));
    if (styleFilter.size > 0) params.set("style", [...styleFilter].join(","));
    const qs = params.toString();
    setLocation(`/plan/list${qs ? `?${qs}` : ""}`, { replace: true } as never);
  }, [groupTypeFilter, budgetFilter, needsFilter, modeFilter, travelersFilter, styleFilter]); // eslint-disable-line

  useEffect(() => {
    try { localStorage.setItem("planListSortBy", sortBy); } catch { /* ignore */ }
  }, [sortBy]);

  useEffect(() => {
    try { localStorage.setItem("planListFilterOpen", String(showFilters)); } catch { /* ignore */ }
  }, [showFilters]);

  useEffect(() => {
    apiFetch("/api/plan/saved")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPlans(data); setLoading(false); })
      .catch(() => { setError("加载失败，请刷新重试"); setLoading(false); });
  }, []);

  const activeFilterCount = groupTypeFilter.size + budgetFilter.size + needsFilter.size + modeFilter.size + travelersFilter.size + styleFilter.size;

  const clearAllFilters = () => {
    [...groupTypeFilter].forEach(v => toggleGroupType(v));
    [...budgetFilter].forEach(v => toggleBudget(v));
    [...needsFilter].forEach(v => toggleNeeds(v));
    [...modeFilter].forEach(v => toggleMode(v));
    [...travelersFilter].forEach(v => toggleTravelers(v));
    [...styleFilter].forEach(v => toggleStyle(v));
    setShowFilters(false);
    try { localStorage.removeItem("planListFilterOpen"); } catch { /* ignore */ }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkToast(true);
      setTimeout(() => setCopyLinkToast(false), 2000);
    } catch {
      // clipboard API unavailable — silent fail
    }
  };

  // Core per-plan filter predicate (omit whichever group is being counted)
  const matchesPlan = useMemo(() => (
    p: SavedPlan,
    opts: {
      groupType?: Set<string>;
      budget?: Set<string>;
      needs?: Set<string>;
      mode?: Set<string>;
      travelers?: Set<string>;
      style?: Set<string>;
    }
  ) => {
    const gt = opts.groupType ?? groupTypeFilter;
    const bd = opts.budget ?? budgetFilter;
    const nd = opts.needs ?? needsFilter;
    const md = opts.mode ?? modeFilter;
    const tv = opts.travelers ?? travelersFilter;
    const st = opts.style ?? styleFilter;
    if (gt.size > 0 && (!p.groupType || !gt.has(p.groupType))) return false;
    if (bd.size > 0) {
      const lbl = budgetLabel(p.budget);
      if (!lbl || !bd.has(lbl)) return false;
    }
    if (nd.size > 0) {
      const needs = p.specialNeeds ?? [];
      if (![...nd].every(n => needs.includes(n))) return false;
    }
    if (md.size > 0) {
      if (!p.travelMode || !md.has(p.travelMode)) return false;
    }
    if (tv.size > 0) {
      if (!tv.has(travelerBucket(p.travelers))) return false;
    }
    if (st.size > 0) {
      if (!p.style || !st.has(p.style)) return false;
    }
    return true;
  }, [groupTypeFilter, budgetFilter, needsFilter, modeFilter, travelersFilter, styleFilter]);

  const filteredPlans = useMemo(() => {
    const filtered = plans.filter(p => matchesPlan(p, {}));
    return [...filtered].sort((a, b) => {
      if (sortBy === "lastViewedAt") {
        const aDate = a.lastViewedAt ?? a.createdAt;
        const bDate = b.lastViewedAt ?? b.createdAt;
        return bDate.localeCompare(aDate);
      }
      if (sortBy === "leastViewed") {
        const aDate = a.lastViewedAt ?? a.createdAt;
        const bDate = b.lastViewedAt ?? b.createdAt;
        return aDate.localeCompare(bDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [plans, matchesPlan, sortBy]);

  // Per-option counts (how many plans match all OTHER active filters + this option)
  const groupTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const { key } of GROUP_TYPE_CHIPS) {
      const testSet = new Set([...groupTypeFilter, key]);
      map.set(key, plans.filter(p => matchesPlan(p, { groupType: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan, groupTypeFilter]);

  const budgetCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of BUDGET_OPTIONS) {
      const testSet = new Set([opt]);
      map.set(opt, plans.filter(p => matchesPlan(p, { budget: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan]);

  const needsCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of SPECIAL_NEEDS_OPTIONS) {
      const testSet = new Set([...needsFilter, opt]);
      map.set(opt, plans.filter(p => matchesPlan(p, { needs: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan, needsFilter]);

  const modeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of TRAVEL_MODE_OPTIONS) {
      const testSet = new Set([opt]);
      map.set(opt, plans.filter(p => matchesPlan(p, { mode: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan]);

  const travelerCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of TRAVELER_OPTIONS) {
      const testSet = new Set([opt]);
      map.set(opt, plans.filter(p => matchesPlan(p, { travelers: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan]);

  const styleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of STYLE_OPTIONS) {
      const testSet = new Set([opt]);
      map.set(opt, plans.filter(p => matchesPlan(p, { style: testSet })).length);
    }
    return map;
  }, [plans, matchesPlan]);

  const handleRename = async (id: number) => {
    const trimmed = renameTitle.trim();
    if (!trimmed) { setRenamingId(null); setRenameTitle(""); return; }
    const oldTitle = plans.find(p => p.id === id)?.title ?? "";
    if (trimmed === oldTitle) { setRenamingId(null); setRenameTitle(""); return; }
    setPlans(prev => prev.map(p => p.id === id ? { ...p, title: trimmed } : p));
    setRenamingId(null);
    setRenameTitle("");
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setFlashRenamedId(id);
        setTimeout(() => { setFlashRenamedId(null); setFadingRenamedId(id); setTimeout(() => setFadingRenamedId(null), 300); }, 700);
      } else {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
        setFlashRenameErrorId(id);
        setTimeout(() => { setFlashRenameErrorId(null); setFadingRenameErrorId(id); setTimeout(() => setFadingRenameErrorId(null), 300); }, 1200);
      }
    } catch {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
      setFlashRenameErrorId(id);
      setTimeout(() => { setFlashRenameErrorId(null); setFadingRenameErrorId(id); setTimeout(() => setFadingRenameErrorId(null), 300); }, 1200);
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
      {/* Copy-link toast */}
      {copyLinkToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-3.5 h-3.5 text-green-400" />
          链接已复制
        </div>
      )}
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
                  onClick={() => setSortBy(v =>
                    v === "createdAt" ? "lastViewedAt" :
                    v === "lastViewedAt" ? "leastViewed" : "createdAt"
                  )}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    sortBy !== "createdAt"
                      ? "bg-primary/8 border-primary/30 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                  title={
                    sortBy === "createdAt" ? "当前：最新保存" :
                    sortBy === "lastViewedAt" ? "当前：最近查看" : "当前：最久未看"
                  }
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === "createdAt" ? "最新保存" :
                   sortBy === "lastViewedAt" ? "最近查看" : "最久未看"}
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
                  {activeFilterCount > 0
                    ? <>筛选 <span className="opacity-60">·</span> {filteredPlans.length} 份</>
                    : "筛选"}
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
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0">出行类型</span>
                <button
                  onClick={() => [...groupTypeFilter].forEach(v => toggleGroupType(v))}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                    groupTypeFilter.size === 0
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  全部
                </button>
                {GROUP_TYPE_CHIPS.map(({ key, label, activeCls, inactiveCls }) => {
                  const count = groupTypeCounts.get(key) ?? 0;
                  const isActive = groupTypeFilter.has(key);
                  const isZero = count === 0 && !isActive;
                  return (
                    <button
                      key={key}
                      onClick={() => { if (!isZero) toggleGroupType(key); }}
                      disabled={isZero}
                      aria-label={isZero ? `${label}（暂无匹配结果）` : undefined}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                        isActive ? activeCls : isZero ? "opacity-40 cursor-not-allowed " + inactiveCls : inactiveCls
                      }`}
                    >
                      {label}<span className={`ml-1 ${isActive ? "opacity-70" : "opacity-60"}`}>({count})</span>
                    </button>
                  );
                })}
              </div>
              {GROUP_TYPE_CHIPS.some(({ key }) => (groupTypeCounts.get(key) ?? 0) === 0 && !groupTypeFilter.has(key)) && (
                <p className="text-[10px] text-muted-foreground/50 pl-1 italic">灰色选项与当前筛选无匹配</p>
              )}
            </div>
            {groupTypeFilter.size >= 2 && (
              <p className="text-[10px] text-muted-foreground/70 pl-1 -mt-1">
                {GROUP_TYPE_CHIPS.filter(c => groupTypeFilter.has(c.key)).map(c => c.shortLabel).join(" · ")} 均会显示
              </p>
            )}
            <ChipGroup
              label="预算"
              options={BUDGET_OPTIONS}
              selected={budgetFilter}
              onToggle={toggleBudget}
              counts={budgetCounts}
            />
            <ChipGroup
              label="特殊需求"
              options={SPECIAL_NEEDS_OPTIONS}
              selected={needsFilter}
              onToggle={toggleNeeds}
              counts={needsCounts}
            />
            <ChipGroup
              label="出行方式"
              options={TRAVEL_MODE_OPTIONS}
              selected={modeFilter}
              onToggle={toggleMode}
              counts={modeCounts}
            />
            <ChipGroup
              label="出行人数"
              options={TRAVELER_OPTIONS}
              selected={travelersFilter}
              onToggle={toggleTravelers}
              counts={travelerCounts}
            />
            <ChipGroup
              label="出行风格"
              options={STYLE_OPTIONS}
              selected={styleFilter}
              onToggle={toggleStyle}
              counts={styleCounts}
            />
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                >
                  清除全部筛选
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {copyLinkToast
                    ? <Check className="w-3 h-3" />
                    : <Copy className="w-3 h-3" />
                  }
                  复制链接
                </button>
              </div>
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
                                  className={`text-sm font-semibold leading-snug truncate cursor-text rounded px-0.5 ${
                                    flashRenamedId === plan.id
                                      ? "rename-flash-ok"
                                      : fadingRenamedId === plan.id
                                        ? "rename-flash-ok-fade"
                                        : flashRenameErrorId === plan.id
                                          ? "rename-flash-err"
                                          : fadingRenameErrorId === plan.id
                                            ? "rename-flash-err-fade"
                                            : "text-foreground group-hover:text-primary transition-colors"
                                  }`}
                                  title="点击重命名"
                                  onClick={e => { e.stopPropagation(); e.preventDefault(); setRenamingId(plan.id); setRenameTitle(plan.title); }}
                                >
                                  {plan.title}
                                </h3>
                                {flashRenamedId === plan.id ? (
                                  <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1 py-0.5 leading-none shrink-0 animate-in fade-in duration-150">
                                    已保存
                                  </span>
                                ) : (
                                  <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-40 transition-opacity shrink-0 text-muted-foreground" />
                                )}
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
                          {plan.lastViewedAt ? (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                              上次查看：{relativeTime(plan.lastViewedAt)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40 italic">
                              从未查看
                            </span>
                          )}
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

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/20">
                          <span className="text-[11px] text-muted-foreground/50">点击卡片查看完整行程</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLocation(`/plan?load=${plan.id}&replan=1`); }}
                            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/5"
                          >
                            <RotateCcw className="w-3 h-3" />重新规划
                          </button>
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
