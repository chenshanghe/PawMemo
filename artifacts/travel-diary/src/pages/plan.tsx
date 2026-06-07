import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { wgs84ToGcj02 } from "@/lib/coords";
import { Layout } from "@/components/layout";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation } from "wouter";
import { Plus, X, Loader2, MapPin, Plane, Train, Hotel, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, Lightbulb, Bookmark, BookmarkCheck, Trash2, RefreshCw, List, Pencil, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
const GROUP_TYPES = [
  { value: "solo",    label: "🧍 独自",   color: "bg-violet-500 border-violet-500", hover: "hover:border-violet-300" },
  { value: "couple",  label: "💑 情侣",   color: "bg-pink-500 border-pink-500",    hover: "hover:border-pink-300" },
  { value: "family",  label: "👨‍👩‍👧 家庭",   color: "bg-amber-500 border-amber-500",  hover: "hover:border-amber-300" },
  { value: "friends", label: "👫 朋友",   color: "bg-teal-500 border-teal-500",    hover: "hover:border-teal-300" },
] as const;
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
  travelers: number;
  groupType: string;
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
  groupType: string | null;
  createdAt: string;
}

interface ReplanSnapshot {
  from: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  travelers: number;
  groupType: string;
  travelMode: string;
  budget: string;
  specialNeeds: string[];
  style: string;
}

const GROUP_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  solo:    { label: "🧍 独自",  cls: "bg-violet-50 text-violet-600" },
  couple:  { label: "💑 情侣",  cls: "bg-pink-50 text-pink-600" },
  family:  { label: "👨‍👩‍👧 家庭", cls: "bg-amber-50 text-amber-600" },
  friends: { label: "👫 朋友",  cls: "bg-teal-50 text-teal-600" },
};

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

function SavedPlanCard({ plan, onLoad, onDelete, onRename }: { plan: SavedPlan; onLoad: (id: number) => void; onDelete: (id: number) => void; onRename: (id: number, title: string) => Promise<boolean> }) {
  const nights = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000);
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(plan.title);
  const [flashOk, setFlashOk] = React.useState(false);
  const [flashErr, setFlashErr] = React.useState(false);
  const [fadingOk, setFadingOk] = React.useState(false);
  const [fadingErr, setFadingErr] = React.useState(false);
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => { setEditTitle(plan.title); }, [plan.title]);
  React.useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const commitRename = async () => {
    const trimmed = editTitle.trim();
    setEditing(false);
    if (!trimmed || trimmed === plan.title) { setEditTitle(plan.title); return; }
    const ok = await onRename(plan.id, trimmed);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (ok) {
      setFlashOk(true);
      flashTimer.current = setTimeout(() => { setFlashOk(false); setFadingOk(true); flashTimer.current = setTimeout(() => setFadingOk(false), 300); }, 700);
    } else {
      setFlashErr(true);
      flashTimer.current = setTimeout(() => { setFlashErr(false); setFadingErr(true); flashTimer.current = setTimeout(() => setFadingErr(false), 300); }, 1200);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !editing && onLoad(plan.id)}>
        <div className="flex items-center gap-1 group/title">
          {editing ? (
            <input
              autoFocus
              className="text-sm font-semibold bg-transparent border-b border-primary outline-none flex-1 min-w-0 text-foreground"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                if (e.key === "Escape") { setEditing(false); setEditTitle(plan.title); }
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              onBlur={commitRename}
            />
          ) : (
            <>
              <p
                className={`text-sm font-semibold truncate cursor-text rounded px-0.5 ${
                  flashOk
                    ? "rename-flash-ok"
                    : fadingOk
                      ? "rename-flash-ok-fade"
                      : flashErr
                        ? "rename-flash-err"
                        : fadingErr
                          ? "rename-flash-err-fade"
                          : "text-foreground group-hover:text-primary transition-colors"
                }`}
                title="点击重命名"
                onClick={e => { e.stopPropagation(); setEditing(true); }}
              >{plan.title}</p>
              <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-40 transition-opacity shrink-0 text-muted-foreground" />
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.from} → {plan.destinations.join("、")} · {nights} 晚</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground/70">{plan.startDate.slice(0, 7)}</span>
          {plan.travelers > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">👥 {plan.travelers}人</span>}
          {plan.groupType && GROUP_TYPE_BADGE[plan.groupType] && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${GROUP_TYPE_BADGE[plan.groupType].cls}`}>
              {GROUP_TYPE_BADGE[plan.groupType].label}
            </span>
          )}
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
  const [travelers, setTravelers] = useState(savedPrefs?.travelers ?? 2);
  const [groupType, setGroupType] = useState<string>(savedPrefs?.groupType ?? "");
  const [style, setStyle] = useState(savedPrefs?.travelStyle || "文化探索");
  const [travelMode, setTravelMode] = useState<string>(savedPrefs?.travelMode ?? "");
  const [budget, setBudget] = useState<string>(savedPrefs?.budget ?? "");
  const [specialNeeds, setSpecialNeeds] = useState<string[]>(savedPrefs?.specialNeeds ?? []);
  const [hasPrefs, setHasPrefs] = useState<boolean>(savedPrefs !== null);
  const [savedPrefsSnapshot, setSavedPrefsSnapshot] = useState<UserPrefs | null>(savedPrefs);
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
  const [isReplanMode, setIsReplanMode] = useState(false);
  const [replanBannerDismissed, setReplanBannerDismissed] = useState(false);
  const [replanSnapshot, setReplanSnapshot] = useState<ReplanSnapshot | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const editTitleRef = useRef<HTMLInputElement>(null);
  const [flashRenamedTitle, setFlashRenamedTitle] = useState(false);
  const [syncedToAccount, setSyncedToAccount] = useState(false);
  const syncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clearedPrefs, setClearedPrefs] = useState(false);
  const clearedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clearPrefsError, setClearPrefsError] = useState(false);
  const clearPrefsErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmClearPrefs, setConfirmClearPrefs] = useState(false);
  const confirmClearPrefsRef = useRef<HTMLSpanElement>(null);
  const [showReplanDiffDialog, setShowReplanDiffDialog] = useState(false);

  useEffect(() => {
    if (!confirmClearPrefs) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (confirmClearPrefsRef.current && !confirmClearPrefsRef.current.contains(e.target as Node)) {
        setConfirmClearPrefs(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmClearPrefs(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmClearPrefs]);

  useEffect(() => { setSelectedPoi(null); }, [activeDay]);

  useEffect(() => {
    if (!hasPrefs) setConfirmClearPrefs(false);
  }, [hasPrefs]);

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
        if (typeof prefs.travelers === "number" && prefs.travelers >= 1) setTravelers(prefs.travelers);
        if (prefs.groupType) setGroupType(prefs.groupType);
        const anySet = !!(prefs.travelMode || prefs.budget || (prefs.specialNeeds?.length ?? 0) > 0 || prefs.fromCity || prefs.travelStyle);
        setHasPrefs(anySet);
        const snap: UserPrefs = { travelMode: prefs.travelMode ?? "", budget: prefs.budget ?? "", specialNeeds: prefs.specialNeeds ?? [], fromCity: prefs.fromCity ?? "", travelStyle: prefs.travelStyle ?? "", travelers: prefs.travelers ?? 2, groupType: prefs.groupType ?? "" };
        if (anySet) { savePrefs(snap); setSavedPrefsSnapshot(snap); }
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
    savePrefs({ travelMode, budget, specialNeeds, fromCity: from, travelStyle: style, travelers, groupType });
    setHasPrefs(true);
    if (isSignedIn) {
      apiFetch("/api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelMode, budget, specialNeeds, fromCity: from, travelStyle: style, travelers, groupType }),
      }).then(r => {
        if (r.ok) {
          setSyncedToAccount(true);
          if (syncedTimer.current) clearTimeout(syncedTimer.current);
          syncedTimer.current = setTimeout(() => setSyncedToAccount(false), 2000);
        }
      }).catch(() => {});
    }
  }, [travelMode, budget, specialNeeds, from, style, travelers, groupType]);

  useEffect(() => {
    apiFetch("/api/plan/saved")
      .then(r => r.ok ? r.json() : [])
      .then(setSavedPlans)
      .catch(() => {});
  }, []);

  // Load a plan from ?load= query param (e.g. navigated from /plan/list)
  // If ?replan=1 is also set, skip the result view and go straight to replan form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    const openReplan = params.get("replan") === "1";
    if (!loadId) return;
    const id = parseInt(loadId);
    if (isNaN(id)) return;
    // Remove query param from URL without triggering re-render
    window.history.replaceState({}, "", window.location.pathname);
    handleLoadSaved(id, openReplan);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearPrefs = () => {
    isClearingPrefs.current = true;
    clearPrefs();
    setTravelMode("");
    setBudget("");
    setSpecialNeeds([]);
    setFrom("");
    setStyle("文化探索");
    setTravelers(2);
    setGroupType("");
    setHasPrefs(false);
    setSavedPrefsSnapshot(null);
    setClearedPrefs(true);
    if (clearedTimer.current) clearTimeout(clearedTimer.current);
    clearedTimer.current = setTimeout(() => setClearedPrefs(false), 2000);
    if (isSignedIn) {
      const payload = JSON.stringify({ travelMode: "", budget: "", specialNeeds: [], fromCity: "", travelStyle: "", travelers: 2, groupType: "" });
      const attemptClear = (retriesLeft: number) => {
        apiFetch("/api/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).then(r => {
          if (!r.ok) throw new Error("failed");
        }).catch(() => {
          if (retriesLeft > 0) {
            setTimeout(() => attemptClear(retriesLeft - 1), 1500);
          } else {
            setClearPrefsError(true);
            if (clearPrefsErrorTimer.current) clearTimeout(clearPrefsErrorTimer.current);
            clearPrefsErrorTimer.current = setTimeout(() => setClearPrefsError(false), 4000);
          }
        });
      };
      attemptClear(2);
    }
  };

  const addDestination = () => setDestinations(d => [...d, ""]);
  const removeDestination = (i: number) => setDestinations(d => d.filter((_, idx) => idx !== i));
  const updateDestination = (i: number, v: string) => setDestinations(d => d.map((x, idx) => idx === i ? v : x));

  const handleGenerate = async () => {
    const filledDests = destinations.filter(d => d.trim());
    if (!from.trim() || !filledDests.length) { setError("请填写出发城市和目的地"); return; }

    if (isReplanMode && replanSnapshot) {
      const changedFields = (["from", "destinations", "startDate", "endDate", "travelers", "groupType", "travelMode", "budget", "specialNeeds", "style"] as (keyof ReplanSnapshot)[])
        .filter(field => replanChanged(field));
      if (changedFields.length > 0) {
        setShowReplanDiffDialog(true);
        return;
      }
    }

    await doGenerate();
  };

  const doGenerate = async () => {
    setShowReplanDiffDialog(false);
    const filledDests = destinations.filter(d => d.trim());
    setError(null);
    setSavedId(null);
    // Don't clear replanMode here if we are about to generate,
    // though the original code did setIsReplanMode(false)
    // Actually, when generating a NEW plan from a replan, it usually becomes the current result.
    setIsReplanMode(false);
    setReplanSnapshot(null);
    setState("generating");
    const params = { from: from.trim(), destinations: filledDests, startDate, endDate, travelers, style, travelMode: travelMode || undefined, budget: budget || undefined, specialNeeds: specialNeeds.length ? specialNeeds : undefined, groupType: groupType || undefined };
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

  const handleLoadSaved = async (id: number, openReplan = false) => {
    setLoadingPlanId(id);
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`);
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error);
      setResult(plan.planData);
      const loadedStart = plan.startDate ?? today;
      const loadedEnd = plan.endDate ?? nextWeek;
      const datesAreStale = loadedStart < today;
      const effectiveStart = datesAreStale ? today : loadedStart;
      const effectiveEnd = datesAreStale ? nextWeek : loadedEnd;
      setCurrentPlanParams({
        from: plan.from,
        destinations: plan.destinations,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        travelers: plan.travelers,
        style: plan.style,
        travelMode: plan.travelMode,
        budget: plan.budget,
        specialNeeds: plan.specialNeeds,
        groupType: plan.groupType ?? undefined,
      });
      const loadedFrom = plan.from ?? "";
      const loadedDestinations = Array.isArray(plan.destinations) && plan.destinations.length ? plan.destinations : [""];
      const loadedTravelers = plan.travelers ?? 2;
      const loadedStyle = plan.style ?? "文化探索";
      const loadedTravelMode = plan.travelMode ?? "";
      const loadedBudget = plan.budget ?? "";
      const loadedGroupType = plan.groupType ?? "";
      const loadedSpecialNeeds = Array.isArray(plan.specialNeeds) ? plan.specialNeeds : [];
      setFrom(loadedFrom);
      setDestinations(loadedDestinations);
      setStartDate(effectiveStart);
      setEndDate(effectiveEnd);
      setTravelers(loadedTravelers);
      setStyle(loadedStyle);
      setTravelMode(loadedTravelMode);
      setBudget(loadedBudget);
      setGroupType(loadedGroupType);
      setSpecialNeeds(loadedSpecialNeeds);
      setReplanSnapshot({
        from: loadedFrom,
        destinations: loadedDestinations,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        travelers: loadedTravelers,
        style: loadedStyle,
        travelMode: loadedTravelMode,
        budget: loadedBudget,
        groupType: loadedGroupType,
        specialNeeds: loadedSpecialNeeds,
      });
      setActiveDay(0);
      if (openReplan) {
        setSavedId(null);
        setIsReplanMode(true);
        setReplanBannerDismissed(false);
        setState("form");
      } else {
        setSavedId(id);
        setState("result");
      }
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

  const handleRenameSaved = async (id: number, newTitle: string): Promise<boolean> => {
    const oldTitle = savedPlans.find(p => p.id === id)?.title ?? "";
    setSavedPlans(prev => prev.map(p => p.id === id ? { ...p, title: newTitle } : p));
    if (savedId === id) setResult(prev => prev ? { ...prev, title: newTitle } : prev);
    try {
      const res = await apiFetch(`/api/plan/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) {
        setSavedPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
        if (savedId === id) setResult(prev => prev ? { ...prev, title: oldTitle } : prev);
        return false;
      }
      return true;
    } catch {
      setSavedPlans(prev => prev.map(p => p.id === id ? { ...p, title: oldTitle } : p));
      if (savedId === id) setResult(prev => prev ? { ...prev, title: oldTitle } : prev);
      return false;
    }
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

  const replanChanged = (field: keyof ReplanSnapshot): boolean => {
    if (!isReplanMode || !replanSnapshot) return false;
    const snap = replanSnapshot;
    switch (field) {
      case "from": return from !== snap.from;
      case "destinations": return JSON.stringify(destinations.filter(d => d.trim())) !== JSON.stringify(snap.destinations.filter(d => d.trim()));
      case "startDate": return startDate !== snap.startDate;
      case "endDate": return endDate !== snap.endDate;
      case "travelers": return travelers !== snap.travelers;
      case "groupType": return groupType !== snap.groupType;
      case "travelMode": return travelMode !== snap.travelMode;
      case "budget": return budget !== snap.budget;
      case "specialNeeds": return JSON.stringify([...specialNeeds].sort()) !== JSON.stringify([...snap.specialNeeds].sort());
      case "style": return style !== snap.style;
      default: return false;
    }
  };

  const ChangedDot = ({ field }: { field?: keyof ReplanSnapshot }) => (
    <>
      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" title="已从原行程修改" />
      {field && isReplanMode && replanSnapshot && replanChanged(field) && (
        <button
          onClick={(e) => {
            e.preventDefault();
            const snap = replanSnapshot!;
            switch (field) {
              case "from": setFrom(snap.from); break;
              case "destinations": setDestinations([...snap.destinations]); break;
              case "startDate": setStartDate(snap.startDate); break;
              case "endDate": setEndDate(snap.endDate); break;
              case "travelers": setTravelers(snap.travelers); break;
              case "groupType": setGroupType(snap.groupType); break;
              case "travelMode": setTravelMode(snap.travelMode); break;
              case "budget": setBudget(snap.budget); break;
              case "specialNeeds": setSpecialNeeds([...snap.specialNeeds]); break;
              case "style": setStyle(snap.style); break;
            }
          }}
          title="恢复原值"
          className="ml-1 p-0.5 text-amber-500 hover:text-amber-600 transition-colors inline-flex align-middle"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </>
  );

  const getChangedSummary = () => {
    if (!isReplanMode || !replanSnapshot) return [];
    const fields: { key: keyof ReplanSnapshot; label: string }[] = [
      { key: "from", label: "出发地" },
      { key: "destinations", label: "目的地" },
      { key: "startDate", label: "开始日期" },
      { key: "endDate", label: "结束日期" },
      { key: "travelers", label: "出行人数" },
      { key: "groupType", label: "出行类型" },
      { key: "travelMode", label: "出行方式" },
      { key: "budget", label: "预算" },
      { key: "style", label: "旅行风格" },
      { key: "specialNeeds", label: "特殊需求" },
    ];

    const formatValue = (key: keyof ReplanSnapshot, val: any) => {
      if (key === "destinations") return (val as string[]).join("、");
      if (key === "specialNeeds") return (val as string[]).join("、") || "无";
      if (key === "groupType") return GROUP_TYPES.find(g => g.value === val)?.label || val || "未设置";
      if (key === "budget") return (val as string).split("（")[0] || val || "未设置";
      return String(val);
    };

    return fields
      .filter(f => replanChanged(f.key))
      .map(f => ({
        label: f.label,
        old: formatValue(f.key, (replanSnapshot as any)[f.key]),
        new: formatValue(f.key, (
          f.key === "from" ? from :
          f.key === "destinations" ? destinations.filter(d => d.trim()) :
          f.key === "startDate" ? startDate :
          f.key === "endDate" ? endDate :
          f.key === "travelers" ? travelers :
          f.key === "groupType" ? groupType :
          f.key === "travelMode" ? travelMode :
          f.key === "budget" ? budget :
          f.key === "style" ? style :
          f.key === "specialNeeds" ? specialNeeds : ""
        ))
      }));
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
              {state === "result" && result && (
                savedId !== null && isEditingTitle ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      ref={editTitleRef}
                      value={editTitleValue}
                      onChange={e => setEditTitleValue(e.target.value)}
                      onBlur={async () => {
                        const trimmed = editTitleValue.trim();
                        if (trimmed && trimmed !== result.title && savedId !== null) {
                          const ok = await handleRenameSaved(savedId, trimmed);
                          if (ok) {
                            setFlashRenamedTitle(true);
                            setTimeout(() => setFlashRenamedTitle(false), 1500);
                          }
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          setIsEditingTitle(false);
                        }
                      }}
                      className="bg-transparent border-b border-primary/60 outline-none text-xs text-muted-foreground w-40 leading-none pb-0.5"
                      autoFocus
                    />
                    <span className="text-muted-foreground/60">· {result.days.length} 天</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 group">
                    <span>{result.title} · {result.days.length} 天</span>
                    {flashRenamedTitle && (
                      <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1 py-0.5 leading-none animate-in fade-in duration-150">
                        已保存
                      </span>
                    )}
                    {savedId !== null && !flashRenamedTitle && (
                      <button
                        onClick={() => {
                          setEditTitleValue(result.title);
                          setIsEditingTitle(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-muted-foreground/60 hover:text-muted-foreground"
                        title="重命名"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )
              )}
            </p>
            {state === "result" && currentPlanParams?.groupType && GROUP_TYPE_BADGE[currentPlanParams.groupType] && (
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-current/10 ${GROUP_TYPE_BADGE[currentPlanParams.groupType].cls}`}>
                {GROUP_TYPE_BADGE[currentPlanParams.groupType].label}
              </span>
            )}
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
              <button onClick={() => { setIsReplanMode(savedId !== null); setReplanBannerDismissed(false); setState("form"); setSavedId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
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
                    onRename={handleRenameSaved}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {state === "form" && (
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className={`px-5 py-4 ${isReplanMode && !replanBannerDismissed ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-primary/90 to-orange-400"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{isReplanMode && !replanBannerDismissed ? "✏️ 正在修改已保存行程" : "✈️ 告诉我你的旅行计划"}</p>
                  <p className="text-xs text-white/70 mt-0.5">{isReplanMode && !replanBannerDismissed ? "已从上次行程恢复出行偏好，修改后重新生成" : "支持国内及出境路线，AI 推荐中国特色平台预订"}</p>
                </div>
                {isReplanMode && !replanBannerDismissed && (
                  <button
                    onClick={() => setReplanBannerDismissed(true)}
                    className="shrink-0 text-white/70 hover:text-white transition-colors mt-0.5"
                    aria-label="关闭提示"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {hasPrefs && (
                <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>{isSignedIn ? "☁️ 已从账号同步偏好设置" : "✅ 已自动填入上次的偏好设置"}</span>
                    {confirmClearPrefs ? (
                      <span ref={confirmClearPrefsRef} className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="text-muted-foreground">确认清除？</span>
                        <button
                          onClick={() => { setConfirmClearPrefs(false); handleClearPrefs(); }}
                          className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                        >确认</button>
                        <button
                          onClick={() => setConfirmClearPrefs(false)}
                          className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/70 transition-colors font-medium"
                        >取消</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmClearPrefs(true)} className="flex items-center gap-1 text-primary hover:text-primary/70 transition-colors font-medium shrink-0 ml-3">
                        <RotateCcw className="w-3 h-3" />清除偏好
                      </button>
                    )}
                  </div>
                  {[from, style, travelMode, budget ? budget.split("（")[0] : ""].filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: from, changed: savedPrefsSnapshot ? from !== savedPrefsSnapshot.fromCity : false },
                        { label: style, changed: savedPrefsSnapshot ? style !== savedPrefsSnapshot.travelStyle : false },
                        { label: travelMode, changed: savedPrefsSnapshot ? travelMode !== savedPrefsSnapshot.travelMode : false },
                        { label: budget ? budget.split("（")[0] : "", changed: savedPrefsSnapshot ? budget !== savedPrefsSnapshot.budget : false },
                      ].filter(c => c.label).map((chip, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full font-medium transition-all ${chip.changed ? "bg-muted text-muted-foreground line-through opacity-60" : "bg-primary/10 text-primary"}`}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {syncedToAccount && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 animate-in fade-in duration-300">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6.5 11 3 7.5"/></svg>
                  已同步到账号
                </div>
              )}
              {clearedPrefs && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 animate-in fade-in duration-300">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6.5 11 3 7.5"/></svg>
                  偏好已清除
                </div>
              )}
              {clearPrefsError && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 animate-in fade-in duration-300">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.5"/></svg>
                  同步失败，请重试
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  出发城市{replanChanged("from") && <ChangedDot field="from" />}
                </label>
                <input value={from} onChange={e => setFrom(e.target.value)} placeholder="如：北京" className={`w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors ${replanChanged("from") ? "border-amber-400/70" : "border-border/60"}`} />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  目的地{replanChanged("destinations") && <ChangedDot field="destinations" />}
                </label>
                <div className="space-y-2">
                  {destinations.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={d} onChange={e => updateDestination(i, e.target.value)} placeholder={`目的地 ${i + 1}，如：云南`} className={`flex-1 px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors ${replanChanged("destinations") ? "border-amber-400/70" : "border-border/60"}`} />
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
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    出发日期{replanChanged("startDate") && <ChangedDot field="startDate" />}
                  </label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className={`w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${replanChanged("startDate") ? "border-amber-400/70" : "border-border/60"}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    返回日期{replanChanged("endDate") && <ChangedDot field="endDate" />}
                  </label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={`w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${replanChanged("endDate") ? "border-amber-400/70" : "border-border/60"}`} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  出行人数：{travelers} 人{replanChanged("travelers") && <ChangedDot field="travelers" />}
                </label>
                <input type="range" min={1} max={10} value={travelers} onChange={e => setTravelers(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>1</span><span>10</span></div>
              </div>

              {/* Group type */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  出行类型 <span className="text-muted-foreground font-normal">（可选）</span>{replanChanged("groupType") && <ChangedDot field="groupType" />}
                </label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_TYPES.map(g => (
                    <button key={g.value} onClick={() => setGroupType(v => v === g.value ? "" : g.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${groupType === g.value ? `${g.color} text-white` : `border-border/60 text-muted-foreground ${g.hover} hover:text-foreground`}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel mode */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  出行方式 <span className="text-muted-foreground font-normal">（可选）</span>{replanChanged("travelMode") && <ChangedDot field="travelMode" />}
                </label>
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
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  预算档次 <span className="text-muted-foreground font-normal">（可选）</span>{replanChanged("budget") && <ChangedDot field="budget" />}
                </label>
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
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  特殊需求 <span className="text-muted-foreground font-normal">（可多选）</span>{replanChanged("specialNeeds") && <ChangedDot field="specialNeeds" />}
                </label>
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
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  旅行风格{replanChanged("style") && <ChangedDot field="style" />}
                </label>
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

        {/* ── Replan Diff Dialog ── */}
        <Dialog open={showReplanDiffDialog} onOpenChange={setShowReplanDiffDialog}>
          <DialogContent className="max-w-[90vw] w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                确认重新规划
              </DialogTitle>
              <DialogDescription className="text-xs">
                检测到以下内容已变更，重新规划将根据新参数生成完整行程。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {getChangedSummary().map((item, i) => (
                <div key={i} className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-[11px] font-semibold text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground line-through opacity-70 truncate max-w-[120px]">{item.old}</span>
                    <span className="text-muted-foreground opacity-40">→</span>
                    <span className="text-primary font-medium truncate">{item.new}</span>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowReplanDiffDialog(false)} className="flex-1 rounded-xl h-10">
                取消
              </Button>
              <Button onClick={() => doGenerate()} className="flex-1 rounded-xl h-10 bg-primary hover:bg-primary/90">
                确认重规划
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Result ── */}
        {state === "result" && result && (
          <div className="space-y-4">
            {/* ... summary, booking, day detail cards ... */}
          </div>
        )}
      </div>
    </Layout>
  );
}
