import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { wgs84ToGcj02 } from "@/lib/coords";
import { Layout } from "@/components/layout";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation } from "wouter";
import { Plus, X, Loader2, MapPin, Plane, Train, Hotel, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, Lightbulb, Bookmark, BookmarkCheck, Trash2, RefreshCw, List } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function makePinIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border:2.5px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
  });
}

function MapFit({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!coords.length) return;
    if (coords.length === 1) map.setView(coords[0], 13, { animate: true });
    else map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], animate: true });
  }, [coords.map(c => c.join(",")).join("|")]);
  return null;
}

const STYLES = ["文化探索", "美食之旅", "自然风光", "亲子游", "休闲放松"] as const;
const TRAVEL_MODES = [
  { value: "自驾", label: "🚗 自驾" },
  { value: "跟团", label: "🚌 跟团" },
  { value: "背包", label: "🎒 背包" },
  { value: "高铁", label: "🚄 高铁" },
  { value: "飞机", label: "✈️ 飞机" },
] as const;
const BUDGETS = [
  { value: "经济实惠（人均 300 元/天以内）", label: "💰 经济" },
  { value: "舒适中档（人均 300-800 元/天）", label: "💰💰 舒适" },
  { value: "豪华品质（人均 800 元以上/天）", label: "💰💰💰 豪华" },
] as const;

const SPECIAL_NEEDS = [
  { value: "素食友好", label: "🥦 素食友好", desc: "推荐素食/蔬食餐厅" },
  { value: "宠物友好", label: "🐾 宠物友好", desc: "推荐允许携带宠物的场所" },
  { value: "无障碍设施", label: "♿ 无障碍", desc: "推荐无障碍设施完善的景点" },
] as const;

const today = new Date().toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PREFS_KEY = "travel-diary:prefs-v1";

interface UserPrefs {
  travelMode: string;
  budget: string;
  specialNeeds: string[];
  fromCity: string;
  travelStyle: string;
}

function loadPrefs(): UserPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPrefs;
  } catch {
    return null;
  }
}

function savePrefs(prefs: UserPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function clearPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {}
}

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { credentials: "include", ...init });
}

interface PlaceCard { place?: string; name?: string; description: string; duration?: string; tips?: string; cuisine?: string; coords?: { lat: number; lng: number } | null; dianpingUrl?: string; gaodeUrl?: string; }
interface DayPlan { day: number; date: string; city: string; theme: string; morning: PlaceCard; afternoon: PlaceCard; lunch: PlaceCard; dinner: PlaceCard; }
interface BookingLink { name: string; url: string; }
interface PlanResult {
  title: string; summary: string; cities: string[]; days: DayPlan[];
  transport: { from: string; to: string; mode: string; recommendation: string }[];
  tips: string[];
  booking: { flights: { outbound: BookingLink[]; return: BookingLink[] }; trains: { name: string; url: string }[]; hotels: { city: string; links: BookingLink[] }[] };
}
interface SavedPlan {
  id: number; title: string; summary: string | null; from: string;
  destinations: string[]; startDate: string; endDate: string;
  travelers: number; style: string | null; travelMode: string | null; budget: string | null;
  createdAt: string;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors border border-primary/20">
      {children}<ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

function AttractionCard({ data, index, color, highlighted, id }: { data: PlaceCard; index: number; color: string; highlighted?: boolean; id?: string }) {
  return (
    <div id={id} className={`flex gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-all ${highlighted ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border/40 hover:border-primary/20"}`}>
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white mt-0.5" style={{ background: color }}>{index}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{data.place}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{data.description}</p>
        {(data.duration || data.tips) && (
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {data.duration && `⏱ ${data.duration}`}{data.duration && data.tips && " · "}{data.tips && `💡 ${data.tips}`}
          </p>
        )}
        <div className="flex gap-1.5 mt-2">
          {data.dianpingUrl && <LinkButton href={data.dianpingUrl}>大众点评</LinkButton>}
          {data.gaodeUrl && <LinkButton href={data.gaodeUrl}>高德地图</LinkButton>}
        </div>
      </div>
    </div>
  );
}

function MealCard({ data, icon }: { data: PlaceCard; icon: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-border/30 bg-muted/20">
      <span className="text-base mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          {data.cuisine && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{data.cuisine}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{data.description}</p>
        {(data.dianpingUrl || data.gaodeUrl) && (
          <div className="flex gap-1.5 mt-1.5">
            {data.dianpingUrl && <LinkButton href={data.dianpingUrl}>大众点评</LinkButton>}
            {data.gaodeUrl && <LinkButton href={data.gaodeUrl}>高德地图</LinkButton>}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedPlanCard({ plan, onLoad, onDelete }: { plan: SavedPlan; onLoad: (id: number) => void; onDelete: (id: number) => void }) {
  const nights = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000);
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(plan.id)}>
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{plan.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.from} → {plan.destinations.join("、")} · {nights} 晚</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground/70">{plan.startDate.slice(0, 7)}</span>
          {plan.travelMode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{plan.travelMode}</span>}
          {plan.budget && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">{plan.budget.split("（")[0]}</span>}
          {plan.style && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{plan.style}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(plan.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors opacity-0 group-hover:opacity-100">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function PlanPage() {
  const { isSignedIn } = useUser();
  const savedPrefs = loadPrefs();
  const [state, setState] = useState<"form" | "generating" | "result">("form");
  const [from, setFrom] = useState(savedPrefs?.fromCity ?? "");
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState(savedPrefs?.travelStyle || "文化探索");
  const [travelMode, setTravelMode] = useState<string>(savedPrefs?.travelMode ?? "");
  const [budget, setBudget] = useState<string>(savedPrefs?.budget ?? "");
  const [specialNeeds, setSpecialNeeds] = useState<string[]>(savedPrefs?.specialNeeds ?? []);
  const [hasPrefs, setHasPrefs] = useState<boolean>(savedPrefs !== null);
  const prefsInitialized = useRef(false);
  const isClearingPrefs = useRef(false);
  const serverPrefsFetched = useRef(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [currentPlanParams, setCurrentPlanParams] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState<"morning" | "afternoon" | null>(null);
  const dayTabsRef = useRef<HTMLDivElement>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  // Saved plans
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);

  useEffect(() => { setSelectedPoi(null); }, [activeDay]);

  // Fetch server-side prefs when the user is signed in (overrides localStorage)
  useEffect(() => {
    if (!isSignedIn || serverPrefsFetched.current) return;
    serverPrefsFetched.current = true;
    apiFetch("/api/prefs")
      .then(r => r.ok ? r.json() : null)
      .then((prefs: UserPrefs | null) => {
        if (!prefs) return;
        // Suppress the normal save-on-change effect for these programmatic updates
        isClearingPrefs.current = true;
        setTravelMode(prefs.travelMode ?? "");
        setBudget(prefs.budget ?? "");
        setSpecialNeeds(prefs.specialNeeds ?? []);
        if (prefs.fromCity) setFrom(prefs.fromCity);
        if (prefs.travelStyle) setStyle(prefs.travelStyle);
        const anySet = !!(prefs.travelMode || prefs.budget || (prefs.specialNeeds?.length ?? 0) > 0 || prefs.fromCity || prefs.travelStyle);
        setHasPrefs(anySet);
        if (anySet) savePrefs({ travelMode: prefs.travelMode ?? "", budget: prefs.budget ?? "", specialNeeds: prefs.specialNeeds ?? [], fromCity: prefs.fromCity ?? "", travelStyle: prefs.travelStyle ?? "" });
      })
      .catch(() => {});
  }, [isSignedIn]);

  // Persist preferences whenever they change (skip initial mount to avoid
  // overwriting a "no prefs" state with the default empty values; also skip
  // when the user explicitly cleared prefs so we don't re-save empty values)
  useEffect(() => {
    if (!prefsInitialized.current) {
      prefsInitialized.current = true;
      return;
    }
    if (isClearingPrefs.current) {
      isClearingPrefs.current = false;
      return;
    }
    savePrefs({ travelMode, budget, specialNeeds, fromCity: from, travelStyle: style });
    setHasPrefs(true);
    if (isSignedIn) {
      apiFetch("/api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelMode, budget, specialNeeds, fromCity: from, travelStyle: style }),
      }).catch(() => {});
    }
  }, [travelMode, budget, specialNeeds, from, style]);

  useEffect(() => {
    apiFetch("/api/plan/saved")
      .then(r => r.ok ? r.json() : [])
      .then(setSavedPlans)
      .catch(() => {});
  }, []);

  // Load a plan from ?load= query param (e.g. navigated from /plan/list)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    const id = parseInt(loadId);
    if (isNaN(id)) return;
    // Remove query param from URL without triggering re-render
    window.history.replaceState({}, "", window.location.pathname);
    handleLoadSaved(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearPrefs = () => {
    isClearingPrefs.current = true;
    clearPrefs();
    setTravelMode("");
    setBudget("");
    setSpecialNeeds([]);
    setFrom("");
    setStyle("文化探索");
    setHasPrefs(false);
    if (isSignedIn) {
      apiFetch("/api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelMode: "", budget: "", specialNeeds: [], fromCity: "", travelStyle: "" }),
      }).catch(() => {});
    }
  };

  const addDestination = () => setDestinations(d => [...d, ""]);
  const removeDestination = (i: number) => setDestinations(d => d.filter((_, idx) => idx !== i));
  const updateDestination = (i: number, v: string) => setDestinations(d => d.map((x, idx) => idx === i ? v : x));

  const handleGenerate = async () => {
    const filledDests = destinations.filter(d => d.trim());
    if (!from.trim() || !filledDests.length) { setError("请填写出发城市和目的地"); return; }
    setError(null);
    setSavedId(null);
    setState("generating");
    const params = { from: from.trim(), destinations: filledDests, startDate, endDate, travelers, style, travelMode: travelMode || undefined, budget: budget || undefined, specialNeeds: specialNeeds.length ? specialNeeds : undefined };
    setCurrentPlanParams(params);
    try {
      const res = await apiFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      setResult(data);
      setActiveDay(0);
      setState("result");
    } catch (e: any) {
      setError(e.message ?? "AI 规划失败，请重试");
      setState("form");
    }
  };

  const handleSave = async () => {
    if (!result || !currentPlanParams) return;
    setSaveLoading(true);
    try {
      const res = await apiFetch("/api/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentPlanParams, planData: result }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error);
      setSavedId(saved.id);
      setSavedPlans(prev => [saved, ...prev]);
    } catch (e: any) {
      setError(e.message ?? "保存失败");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLoadSaved = async (id: number) => {
    setLoadingPlanId(id);
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`);
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error);
      setResult(plan.planData);
      setCurrentPlanParams({
        from: plan.from,
        destinations: plan.destinations,
        startDate: plan.startDate,
        endDate: plan.endDate,
        travelers: plan.travelers,
        style: plan.style,
        travelMode: plan.travelMode,
        budget: plan.budget,
        specialNeeds: plan.specialNeeds,
      });
      if (Array.isArray(plan.specialNeeds)) setSpecialNeeds(plan.specialNeeds);
      else setSpecialNeeds([]);
      setSavedId(id);
      setActiveDay(0);
      setState("result");
      setSavedOpen(false);
    } catch {
      setError("加载失败，请重试");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleDeleteSaved = async (id: number) => {
    try {
      await apiFetch(`/api/plan/saved/${id}`, { method: "DELETE" });
      setSavedPlans(prev => prev.filter(p => p.id !== id));
      if (savedId === id) setSavedId(null);
    } catch {}
  };

  const handleRegenerate = async () => {
    if (!currentPlanParams) return;
    setRegenLoading(true);
    setError(null);
    setSavedId(null);
    setState("generating");
    try {
      const res = await apiFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPlanParams),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      setResult(data);
      setActiveDay(0);
      setState("result");
    } catch (e: any) {
      setError(e.message ?? "AI 规划失败，请重试");
      setState("result");
    } finally {
      setRegenLoading(false);
    }
  };

  const day = result?.days[activeDay];
  const dayCoords: [number, number][] = day
    ? [day.morning?.coords, day.afternoon?.coords].filter(Boolean).map(c => wgs84ToGcj02(c!.lat, c!.lng))
    : [];

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];
  const dayColor = (i: number) => COLORS[i % COLORS.length];

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">旅行规划</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state === "form" && "AI 智能规划行程，一键直达携程/去哪儿预订"}
              {state === "generating" && "AI 正在生成你的专属行程…"}
              {state === "result" && result && `${result.title} · ${result.days.length} 天`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* My plans list link */}
            <a href={`${BASE}/plan/list`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <List className="w-3.5 h-3.5" />
              我的规划
              {savedPlans.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[9px] text-white flex items-center justify-center font-bold">
                  {savedPlans.length}
                </span>
              )}
            </a>
            {state === "result" && savedId !== null && (
              <button
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                重新生成
              </button>
            )}
            {state === "result" && (
              <button onClick={() => { setState("form"); setSavedId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />重新规划
              </button>
            )}
          </div>
        </div>

        {/* ── Saved plans panel ── */}
        {savedOpen && (
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-primary" />我的收藏行程（{savedPlans.length}）
              </p>
              <button onClick={() => setSavedOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {savedPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">还没有收藏的行程，生成后点击「收藏」保存</p>
              ) : (
                savedPlans.map(p => (
                  <SavedPlanCard
                    key={p.id}
                    plan={p}
                    onLoad={handleLoadSaved}
                    onDelete={handleDeleteSaved}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {state === "form" && (
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/90 to-orange-400 px-5 py-4">
              <p className="text-sm font-semibold text-white">✈️ 告诉我你的旅行计划</p>
              <p className="text-xs text-white/70 mt-0.5">支持国内及出境路线，AI 推荐中国特色平台预订</p>
            </div>
            <div className="p-5 space-y-4">
              {hasPrefs && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                  <span>{isSignedIn ? "☁️ 已从账号同步偏好设置" : "✅ 已自动填入上次的偏好设置"}</span>
                  <button onClick={handleClearPrefs} className="flex items-center gap-1 text-primary hover:text-primary/70 transition-colors font-medium shrink-0 ml-3">
                    <RotateCcw className="w-3 h-3" />清除偏好
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">出发城市</label>
                <input value={from} onChange={e => setFrom(e.target.value)} placeholder="如：北京" className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">目的地</label>
                <div className="space-y-2">
                  {destinations.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={d} onChange={e => updateDestination(i, e.target.value)} placeholder={`目的地 ${i + 1}，如：云南`} className="flex-1 px-3 py-2 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40" />
                      {destinations.length > 1 && (
                        <button onClick={() => removeDestination(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {destinations.length < 5 && (
                    <button onClick={addDestination} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-3.5 h-3.5" />添加目的地
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">出发日期</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">返回日期</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">出行人数：{travelers} 人</label>
                <input type="range" min={1} max={10} value={travelers} onChange={e => setTravelers(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>1</span><span>10</span></div>
              </div>

              {/* Travel mode */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">出行方式 <span className="text-muted-foreground font-normal">（可选）</span></label>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_MODES.map(m => (
                    <button key={m.value} onClick={() => setTravelMode(v => v === m.value ? "" : m.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${travelMode === m.value ? "bg-blue-500 text-white border-blue-500" : "border-border/60 text-muted-foreground hover:border-blue-300 hover:text-foreground"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">预算档次 <span className="text-muted-foreground font-normal">（可选）</span></label>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map(b => (
                    <button key={b.value} onClick={() => setBudget(v => v === b.value ? "" : b.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${budget === b.value ? "bg-amber-500 text-white border-amber-500" : "border-border/60 text-muted-foreground hover:border-amber-300 hover:text-foreground"}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special needs */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">特殊需求 <span className="text-muted-foreground font-normal">（可多选）</span></label>
                <div className="flex flex-wrap gap-2">
                  {SPECIAL_NEEDS.map(n => {
                    const selected = specialNeeds.includes(n.value);
                    return (
                      <button key={n.value}
                        onClick={() => setSpecialNeeds(prev => selected ? prev.filter(x => x !== n.value) : [...prev, n.value])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? "bg-emerald-500 text-white border-emerald-500" : "border-border/60 text-muted-foreground hover:border-emerald-300 hover:text-foreground"}`}>
                        {n.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">旅行风格</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${style === s ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={handleGenerate} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-md active:scale-[0.98]">
                ✨ 生成 AI 行程
              </button>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {state === "generating" && (
          <div className="rounded-2xl border border-border/50 bg-card p-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center text-2xl">✈️</div>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">AI 正在规划行程</p>
              <p className="text-sm text-muted-foreground mt-1">正在生成景点、餐厅推荐并获取地图坐标…</p>
              <p className="text-xs text-muted-foreground/60 mt-1">通常需要 15-30 秒</p>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {state === "result" && result && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
              <div className="bg-gradient-to-r from-primary/85 to-orange-400 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-serif font-bold">{result.title}</h3>
                    <p className="text-sm text-white/80 mt-1">{result.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {result.cities.map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">📍 {c}</span>
                      ))}
                      {currentPlanParams?.travelMode && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">{currentPlanParams.travelMode}</span>
                      )}
                      {currentPlanParams?.budget && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">{currentPlanParams.budget.split("（")[0]}</span>
                      )}
                      {Array.isArray(currentPlanParams?.specialNeeds) && currentPlanParams.specialNeeds.map((sn: string) => (
                        <span key={sn} className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">{sn}</span>
                      ))}
                    </div>
                  </div>
                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    disabled={saveLoading || savedId !== null}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      savedId !== null
                        ? "bg-white/30 text-white cursor-default"
                        : "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                    }`}
                  >
                    {saveLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : savedId !== null ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    {savedId !== null ? "已收藏" : "收藏行程"}
                  </button>
                </div>
              </div>
            </div>

            {/* Booking links */}
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <button onClick={() => setBookingOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors">
                <span className="flex items-center gap-2"><Plane className="w-4 h-4 text-primary" />预订快捷入口</span>
                <span className="text-xs text-muted-foreground">{bookingOpen ? "收起" : "展开"}</span>
              </button>
              {bookingOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                  <div className="pt-3">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Plane className="w-3 h-3" />机票</p>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {result.booking.flights.outbound.map(l => <LinkButton key={l.name} href={l.url}>{l.name} 去程</LinkButton>)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.booking.flights.return.map(l => <LinkButton key={l.name} href={l.url}>{l.name}</LinkButton>)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Train className="w-3 h-3" />高铁</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.booking.trains.map(l => <LinkButton key={l.name} href={l.url}>{l.name}</LinkButton>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Hotel className="w-3 h-3" />酒店</p>
                    <div className="space-y-1.5">
                      {result.booking.hotels.map(h => (
                        <div key={h.city} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground w-12 shrink-0">{h.city}</span>
                          {h.links.map(l => <LinkButton key={l.name} href={l.url}>{l.name}</LinkButton>)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Day tabs */}
            <div ref={dayTabsRef} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {result.days.map((d, i) => (
                <button key={i} onClick={() => setActiveDay(i)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-colors border ${activeDay === i ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                >
                  <span className="font-semibold">第 {d.day} 天</span>
                  <span className="text-[10px] mt-0.5">{d.date.slice(5)}</span>
                  <span className="text-[10px] text-muted-foreground">{d.city}</span>
                </button>
              ))}
            </div>

            {/* Day detail */}
            {day && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: dayColor(activeDay) }} />
                  <h4 className="text-sm font-semibold text-foreground">{day.city} · {day.theme}</h4>
                  <span className="text-xs text-muted-foreground ml-auto">{day.date}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">☀️ 上午</p>
                  {day.morning?.place && <AttractionCard id="plan-morning" data={day.morning} index={1} color={dayColor(activeDay)} highlighted={selectedPoi === "morning"} />}
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">🍜 午餐</p>
                  {day.lunch?.name && <MealCard data={day.lunch} icon="🥢" />}
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">🌤 下午</p>
                  {day.afternoon?.place && <AttractionCard id="plan-afternoon" data={day.afternoon} index={2} color={dayColor(activeDay)} highlighted={selectedPoi === "afternoon"} />}
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">🍽 晚餐</p>
                  {day.dinner?.name && <MealCard data={day.dinner} icon="🍽" />}
                </div>

                {/* Day map */}
                {dayCoords.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-border/40 shadow-sm" style={{ height: 220 }}>
                    <MapContainer center={dayCoords[0]} zoom={12} style={{ width: "100%", height: "100%" }} scrollWheelZoom={false} zoomControl={false}>
                      <TileLayer attribution='&copy; <a href="https://www.amap.com/">高德地图</a>' url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains="1234" />
                      <MapFit coords={dayCoords} />
                      {day.morning?.coords && (
                        <Marker
                          position={wgs84ToGcj02(day.morning.coords.lat, day.morning.coords.lng)}
                          icon={makePinIcon("上午", dayColor(activeDay))}
                          eventHandlers={{ click: () => { setSelectedPoi("morning"); document.getElementById("plan-morning")?.scrollIntoView({ behavior: "smooth", block: "center" }); } }}
                        >
                          <Popup><p className="font-medium text-sm">{day.morning.place}</p></Popup>
                        </Marker>
                      )}
                      {day.afternoon?.coords && (
                        <Marker
                          position={wgs84ToGcj02(day.afternoon.coords.lat, day.afternoon.coords.lng)}
                          icon={makePinIcon("下午", "#8b5cf6")}
                          eventHandlers={{ click: () => { setSelectedPoi("afternoon"); document.getElementById("plan-afternoon")?.scrollIntoView({ behavior: "smooth", block: "center" }); } }}
                        >
                          <Popup><p className="font-medium text-sm">{day.afternoon.place}</p></Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>
                )}

                {/* Day nav */}
                <div className="flex gap-2">
                  {activeDay > 0 && (
                    <button onClick={() => setActiveDay(d => d - 1)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />第 {activeDay} 天
                    </button>
                  )}
                  {activeDay < result.days.length - 1 && (
                    <button onClick={() => setActiveDay(d => d + 1)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                      第 {activeDay + 2} 天<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Travel tips */}
            {result.tips?.length > 0 && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" />旅行贴士</p>
                <ul className="space-y-1">
                  {result.tips.map((t, i) => (
                    <li key={i} className="text-xs text-amber-800/80 flex items-start gap-1.5">
                      <span className="mt-0.5 text-amber-400">•</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transport recommendations */}
            {result.transport?.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Train className="w-3.5 h-3.5 text-primary" />交通建议</p>
                {result.transport.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-medium shrink-0">{t.from} → {t.to}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted shrink-0">{t.mode === "flight" ? "✈️ 飞机" : "🚄 高铁"}</span>
                    <span>{t.recommendation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
