import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Pencil, Settings, LogOut, Loader2, Bookmark, Users, BookText, Heart,
  MapPin, CalendarDays, Image as ImageIcon, Lock, Globe, EyeOff, X, ChevronRight,
  Camera, Upload, Wand2, Check, Sparkles, BarChart2,
  Bell, Award, Download, TrendingUp, Smile, Tag, Star, Printer, SlidersHorizontal, RotateCcw, MessageSquare,
  AlertTriangle, Trash2, Shield, FileText, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PayDialog } from "@/components/pay-dialog";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TRAVEL_MODES = [
  { value: "自驾", label: "🚗 自驾" },
  { value: "跟团", label: "🚌 跟团" },
  { value: "背包", label: "🎒 背包" },
  { value: "高铁", label: "🚄 高铁" },
  { value: "飞机", label: "✈️ 飞机" },
];
const GROUP_TYPES = [
  { value: "solo",    label: "🧍 独自",   color: "bg-violet-500 border-violet-500", hover: "hover:border-violet-300" },
  { value: "couple",  label: "💑 情侣",   color: "bg-pink-500 border-pink-500",    hover: "hover:border-pink-300" },
  { value: "family",  label: "👨‍👩‍👧 家庭",   color: "bg-amber-500 border-amber-500",  hover: "hover:border-amber-300" },
  { value: "friends", label: "👫 朋友",   color: "bg-teal-500 border-teal-500",    hover: "hover:border-teal-300" },
];
const BUDGETS = [
  { value: "经济实惠（人均 300 元/天以内）", label: "💰 经济" },
  { value: "舒适中档（人均 300-800 元/天）", label: "💰💰 舒适" },
  { value: "豪华品质（人均 800 元以上/天）", label: "💰💰💰 豪华" },
];
const SPECIAL_NEEDS = [
  { value: "素食友好", label: "🥦 素食友好" },
  { value: "宠物友好", label: "🐾 宠物友好" },
  { value: "无障碍设施", label: "♿ 无障碍" },
];
const TRAVEL_STYLES = ["文化探索", "美食之旅", "自然风光", "亲子游", "休闲放松"];

interface UserPrefs {
  travelMode: string;
  budget: string;
  specialNeeds: string[];
  fromCity: string;
  travelStyle: string;
  travelers: number;
  groupType: string;
}

interface MyProfile {
  userId: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  email: string | null;
  weeklyDigest: boolean;
  entryCount: number;
  publicEntryCount: number;
  followingCount: number;
  followerCount: number;
  likesReceived: number;
  favoritesReceived: number;
}

interface SummaryStats {
  totalEntries: number;
  totalDestinations: number;
  totalPhotos: number;
  totalTravelDays: number;
  longestTripDays: number;
  avgRating: number | null;
  moodCounts: { mood: string; count: number }[];
  topDestinations: { destination: string; count: number }[];
}

interface MonthlyData {
  month: string;
  count: number;
}

interface MyEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  mood: string | null;
  visibility: "private" | "public" | "unlisted";
  coverImage: string | null;
  photoCount: number;
}

interface FavEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  coverPhotoUrl: string | null;
  mood: string | null;
}

interface FollowItem {
  userId: string;
  name: string;
  avatar: string | null;
}

type Tab = "notes" | "favorites" | "following" | "followers" | "report" | "export";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-700",
  平静: "bg-blue-100 text-blue-700",
  感动: "bg-pink-100 text-pink-700",
  疲惫: "bg-gray-100 text-gray-600",
  兴奋: "bg-orange-100 text-orange-700",
  思念: "bg-purple-100 text-purple-700",
};

const VIS_ICON = {
  private: <Lock className="w-3 h-3" />,
  public: <Globe className="w-3 h-3" />,
  unlisted: <EyeOff className="w-3 h-3" />,
};

const PRESET_AVATARS = [
  { url: "https://api.dicebear.com/9.x/adventurer/svg?seed=lychee",      bg: "bg-pink-50" },
  { url: "https://api.dicebear.com/9.x/adventurer/svg?seed=bamboo",      bg: "bg-green-50" },
  { url: "https://api.dicebear.com/9.x/big-smile/svg?seed=journey",      bg: "bg-yellow-50" },
  { url: "https://api.dicebear.com/9.x/big-smile/svg?seed=wanderer",     bg: "bg-orange-50" },
  { url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=traveler",     bg: "bg-blue-50" },
  { url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=explorer",     bg: "bg-purple-50" },
  { url: "https://api.dicebear.com/9.x/micah/svg?seed=nomad",            bg: "bg-teal-50" },
  { url: "https://api.dicebear.com/9.x/micah/svg?seed=pilgrim",          bg: "bg-indigo-50" },
  { url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=globe",        bg: "bg-red-50" },
  { url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=atlas",        bg: "bg-amber-50" },
  { url: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=rover",   bg: "bg-cyan-50" },
  { url: "https://api.dicebear.com/9.x/lorelei/svg?seed=sunset",         bg: "bg-rose-50" },
];

interface SubInfo {
  tier: string;
  tierName: string;
  aiComposedThisMonth: number;
  aiComposeLimit: number;
  aiEnhancedThisMonth: number;
  aiEnhanceLimit: number;
  expiresAt: string | null;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: "免费版", cls: "bg-muted text-muted-foreground" },
  pro:  { label: "Pro",    cls: "bg-primary/15 text-primary" },
  plus: { label: "Plus",   cls: "bg-amber-100 text-amber-700" },
};

export default function Me() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [digestSending, setDigestSending] = useState(false);
  const [digestToast, setDigestToast] = useState<string | null>(null);

  const [showFeedback, setShowFeedback] = useState(false);

  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsDebouncing, setPrefsDebouncing] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsCleared, setPrefsCleared] = useState(false);
  const [prefsSaveError, setPrefsSaveError] = useState<string | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<UserPrefs | null>(null);
  const latestPrefsRef = useRef<UserPrefs | null>(null);
  const prefsPanelRef = useRef<HTMLDivElement>(null);
  const flushAndSaveRef = useRef<(updated: UserPrefs) => Promise<boolean>>(() => Promise.resolve(true));
  const prefsSavingRef = useRef(false);
  const pendingNavRef = useRef<string | null>(null);

  // Account deletion
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pay dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payDialogTier, setPayDialogTier] = useState<"pro" | "plus">("pro");
  const [payDialogPeriod, setPayDialogPeriod] = useState<"monthly" | "yearly">("monthly");

  // Data export
  const [exportPending, setExportPending] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportSummary, setExportSummary] = useState<{
    entryCount: number;
    photoCount: number;
    favoriteCount: number;
    accountCreatedAt: string | null;
  } | null>(null);
  const [exportSummaryLoading, setExportSummaryLoading] = useState(false);
  const [exportSections, setExportSections] = useState({
    entries: true,
    photos: true,
    favorites: true,
    profile: true,
  });

  const handleSelectAvatar = async (url: string) => {
    setAvatarSaving(true);
    try {
      const res = await fetch(`${BASE}/api/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) {
        const d = await res.json();
        setProfile((prev) => prev ? { ...prev, avatar: d.avatar } : prev);
        setShowAvatarPicker(false);
      }
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setAvatarSaving(true);
    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) return;
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await handleSelectAvatar(`/api/storage/objects/${objectPath}`);
    } finally {
      setAvatarSaving(false);
    }
  };

  const [notes, setNotes] = useState<MyEntry[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [favorites, setFavorites] = useState<FavEntry[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [followers, setFollowers] = useState<FollowItem[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [recs, setRecs] = useState<{ name: string; country: string; reason: string; emoji: string; tags: string[] }[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsLoaded, setRecsLoaded] = useState(false);
  const [exportEntries, setExportEntries] = useState<any[]>([]);
  const [exportLoaded, setExportLoaded] = useState(false);
  const [printing, setPrinting] = useState(false);

  const fetchProfile = useCallback(async () => {
    const [pRes, sRes, subRes] = await Promise.all([
      fetch(`${BASE}/api/me/profile`, { credentials: "include" }),
      fetch(`${BASE}/api/stats/summary`, { credentials: "include" }),
      fetch(`${BASE}/api/me/subscription`, { credentials: "include" }),
    ]);
    if (pRes.ok) setProfile(await pRes.json());
    if (sRes.ok) setStats(await sRes.json());
    if (subRes.ok) setSub(await subRes.json());
  }, []);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/prefs`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const loaded: UserPrefs = {
            travelMode: data.travelMode ?? "",
            budget: data.budget ?? "",
            specialNeeds: Array.isArray(data.specialNeeds) ? data.specialNeeds : [],
            fromCity: data.fromCity ?? "",
            travelStyle: data.travelStyle ?? "",
            travelers: typeof data.travelers === "number" && data.travelers >= 1 ? data.travelers : 2,
            groupType: data.groupType ?? "",
          };
          latestPrefsRef.current = loaded;
          setPrefs(loaded);
        } else {
          const empty: UserPrefs = { travelMode: "", budget: "", specialNeeds: [], fromCity: "", travelStyle: "", travelers: 2, groupType: "" };
          latestPrefsRef.current = empty;
          setPrefs(empty);
        }
      }
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  const savePrefs = async (updated: UserPrefs): Promise<boolean> => {
    setPrefsDebouncing(false);
    setPrefsSaving(true);
    prefsSavingRef.current = true;
    setPrefsSaved(false);
    setPrefsCleared(false);
    setPrefsSaveError(null);
    let ok = false;
    try {
      const res = await fetch(`${BASE}/api/prefs`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("save_failed");
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
      ok = true;
      return true;
    } catch {
      setPrefsSaveError(navigator.onLine ? "保存失败，请重试" : "网络不可用");
      setTimeout(() => setPrefsSaveError(null), 4000);
      return false;
    } finally {
      setPrefsSaving(false);
      prefsSavingRef.current = false;
      // Execute queued navigation (only on success; on failure keep user on page to see error)
      if (ok && pendingNavRef.current) {
        const href = pendingNavRef.current;
        pendingNavRef.current = null;
        navigate(href);
      } else {
        pendingNavRef.current = null;
      }
    }
  };

  const flushAndSave = async (updated: UserPrefs): Promise<boolean> => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    pendingSaveRef.current = null;
    setPrefsDebouncing(false);
    return savePrefs(updated);
  };
  flushAndSaveRef.current = flushAndSave;

  const handleClearPrefs = () => {
    const snapshot = prefs;
    const cleared: UserPrefs = { travelMode: "", budget: "", specialNeeds: [], fromCity: "", travelStyle: "", travelers: 2, groupType: "" };
    latestPrefsRef.current = cleared;
    setPrefs(cleared);
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    pendingSaveRef.current = null;
    setPrefsDebouncing(false);
    setPrefsSaving(true);
    setPrefsSaved(false);
    setPrefsSaveError(null);
    fetch(`${BASE}/api/prefs`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleared),
    }).then((res) => {
      if (!res.ok) throw new Error("save_failed");
      setPrefsSaved(true);
      setPrefsCleared(true);
      setTimeout(() => { setPrefsSaved(false); setPrefsCleared(false); }, 2500);
    }).catch(() => {
      latestPrefsRef.current = snapshot;
      setPrefs(snapshot);
      setPrefsSaveError(navigator.onLine ? "清除失败，请重试" : "网络不可用");
      setTimeout(() => setPrefsSaveError(null), 4000);
    }).finally(() => {
      setPrefsSaving(false);
    });
  };

  const updatePrefs = (patch: Partial<UserPrefs>) => {
    setPrefsSaveError(null);
    setPrefsDebouncing(true);
    setPrefs((prev) => {
      const next = { ...(prev ?? { travelMode: "", budget: "", specialNeeds: [], fromCity: "", travelStyle: "", travelers: 2, groupType: "" }), ...patch };
      latestPrefsRef.current = next;
      pendingSaveRef.current = next;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        pendingSaveRef.current = null;
        savePrefs(latestPrefsRef.current!);
      }, 500);
      return next;
    });
  };

  useEffect(() => {
    const el = prefsPanelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (pendingSaveRef.current) {
            if (saveDebounceRef.current) {
              clearTimeout(saveDebounceRef.current);
              saveDebounceRef.current = null;
            }
            const toSave = pendingSaveRef.current;
            pendingSaveRef.current = null;
            setPrefsDebouncing(false);
            savePrefs(toSave);
          } else {
            setPrefsSaved(false);
            setPrefsDebouncing(false);
          }
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  // Browser-level navigation (close tab, hard refresh, external link).
  // • If a save is in-flight, show the browser's native "are you sure?" dialog so the
  //   user knows the request is still running.
  // • If a save is only pending in the debounce queue, fire a keepalive fetch (the
  //   browser guarantees it completes even after the page starts unloading) and let
  //   navigation proceed without a dialog.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (prefsSavingRef.current) {
        // In-flight request: block with native dialog
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      if (pendingSaveRef.current) {
        if (saveDebounceRef.current) {
          clearTimeout(saveDebounceRef.current);
          saveDebounceRef.current = null;
        }
        const toSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        fetch(`${BASE}/api/prefs`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSave),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // SPA navigation (wouter <Link> clicks): intercept internal link clicks in capture
  // phase. Two cases:
  //   1. Save is in-flight (prefsSavingRef): queue the destination and show a toast;
  //      savePrefs() will navigate automatically when it finishes.
  //   2. Save is pending in the debounce queue (pendingSaveRef): flush immediately and
  //      navigate only on success — keeping the user on the page to see and retry when
  //      the save fails.
  // Modified clicks and new-tab links are always passed through.
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const hasPending = !!pendingSaveRef.current;
      const isSaving = prefsSavingRef.current;
      if (!hasPending && !isSaving) return;
      // Skip modified clicks (ctrl/cmd/shift/alt open new tabs or have other behaviours)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const link = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      // Skip new-tab links
      if (link.target === "_blank") return;
      const href = link.getAttribute("href") ?? "";
      // Only intercept internal paths (starts with /)
      if (!href.startsWith("/")) return;
      e.preventDefault();
      e.stopPropagation();
      if (isSaving) {
        // Save already in-flight — queue navigation and show a non-blocking toast
        pendingNavRef.current = href;
        toast({ title: "保存中，请稍候…", duration: 2000 });
      } else {
        // Debounce pending — flush and navigate on success
        flushAndSaveRef.current(latestPrefsRef.current!).then((ok) => {
          // Navigate only when save succeeded; on failure the error UI stays visible
          // so the user can see and retry before leaving.
          if (ok) navigate(href);
        });
      }
    };
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [navigate]);

  // Unmount fallback: if something navigated without going through a link click
  // (e.g. programmatic navigation), flushAndSave handles it. State updates are
  // no-ops on an unmounted component in React 18 but the save request completes.
  useEffect(() => () => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    if (pendingSaveRef.current) {
      flushAndSaveRef.current(latestPrefsRef.current!);
    }
  }, []);

  // Lazy-load tabs
  useEffect(() => {
    if (tab === "notes" && !notesLoaded) {
      fetch(`${BASE}/api/entries`, { credentials: "include" }).then(async (r) => {
        if (r.ok) {
          const all = await r.json();
          setNotes(Array.isArray(all) ? all.filter((e: any) => !e.entryType || e.entryType === "note") : []);
        }
        setNotesLoaded(true);
      });
    }
    if (tab === "favorites" && !favoritesLoaded) {
      fetch(`${BASE}/api/me/favorites?limit=40`, { credentials: "include" }).then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setFavorites(data.entries);
        }
        setFavoritesLoaded(true);
      });
    }
    if (tab === "following" && !followingLoaded) {
      fetch(`${BASE}/api/me/following`, { credentials: "include" }).then(async (r) => {
        if (r.ok) setFollowing(await r.json());
        setFollowingLoaded(true);
      });
    }
    if (tab === "followers" && !followersLoaded) {
      fetch(`${BASE}/api/me/followers`, { credentials: "include" }).then(async (r) => {
        if (r.ok) setFollowers(await r.json());
        setFollowersLoaded(true);
      });
    }
    if (tab === "report" && !statsLoaded) {
      Promise.all([
        fetch(`${BASE}/api/stats/monthly`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch(`${BASE}/api/tags`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]).then(([mData, tData]) => {
        setMonthlyData(mData);
        setTags(Array.isArray(tData) ? tData.slice(0, 30) : []);
        setStatsLoaded(true);
      }).catch(() => setStatsLoaded(true));
    }
    if (tab === "export" && !exportLoaded) {
      fetch(`${BASE}/api/entries?limit=500`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          setExportEntries(Array.isArray(d.entries) ? d.entries : Array.isArray(d) ? d : []);
          setExportLoaded(true);
        })
        .catch(() => setExportLoaded(true));
    }
  }, [tab, notesLoaded, favoritesLoaded, followingLoaded, followersLoaded, statsLoaded, exportLoaded]);

  const handleSignOut = () => signOut();

  const handleToggleDigest = async () => {
    if (!profile) return;
    const next = !profile.weeklyDigest;
    setProfile((p) => p ? { ...p, weeklyDigest: next } : p);
    await fetch(`${BASE}/api/me/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyDigest: next }),
    });
  };

  const handleSendDigest = async () => {
    setDigestSending(true);
    setDigestToast(null);
    try {
      const res = await fetch(`${BASE}/api/digest/send`, { method: "POST", credentials: "include" });
      const d = await res.json();
      if (res.ok) {
        setDigestToast(`✅ 本周回顾已发送至 ${d.to}（共 ${d.entryCount} 篇）`);
      } else {
        setDigestToast(`❌ ${d.error ?? "发送失败"}`);
      }
    } catch {
      setDigestToast("❌ 发送失败，请重试");
    } finally {
      setDigestSending(false);
      setTimeout(() => setDigestToast(null), 5000);
    }
  };

  const handleGetRecs = async () => {
    setRecsLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const d = await r.json();
      setRecs(Array.isArray(d.recommendations) ? d.recommendations : []);
      setRecsLoaded(true);
    } catch {}
    setRecsLoading(false);
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 300);
  };

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="-mt-4 md:-mt-8 -mx-4 md:-mx-8 animate-in fade-in duration-300">
        {/* ── Cover ─────────────────────────────────────────────────────── */}
        <div className="relative h-28 md:h-36 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-orange-300 to-amber-200" />
          {profile.avatar && (
            <img src={profile.avatar} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
          <button
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-sm hover:bg-background transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            编辑主页
          </button>
        </div>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <div className="px-4 md:px-8 -mt-12 relative">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0 group">
              <div className="w-24 h-24 rounded-full ring-4 ring-background bg-primary/20 overflow-hidden flex items-center justify-center text-3xl font-serif font-bold text-primary shadow-md">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  profile.name[0]
                )}
              </div>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-serif font-bold text-foreground">{profile.name}</h2>
              {sub && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_BADGE[sub.tier]?.cls ?? TIER_BADGE.free.cls}`}>
                  {TIER_BADGE[sub.tier]?.label ?? "免费版"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              旅行号：{profile.userId.slice(-10)}
            </p>
            {profile.bio ? (
              <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>
            ) : (
              <button onClick={() => setEditing(true)} className="text-sm text-muted-foreground/70 mt-2 hover:text-primary transition-colors">
                还没有简介，去写一句吧 →
              </button>
            )}
            {/* AI 叙事用量进度 + 套餐管理 */}
            {sub && (
              <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">✨ AI 叙事本月用量</span>
                  <span className="text-xs font-semibold text-foreground">
                    {sub.aiComposedThisMonth} / {sub.aiComposeLimit === 999999 ? "无限" : sub.aiComposeLimit}
                  </span>
                </div>
                {sub.aiComposeLimit < 999999 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (sub.aiComposedThisMonth / sub.aiComposeLimit) * 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">✍️ AI 优化本月用量</span>
                  <span className="text-xs font-semibold text-foreground">
                    {sub.aiEnhancedThisMonth} / {sub.aiEnhanceLimit === 999999 ? "无限" : sub.aiEnhanceLimit}
                  </span>
                </div>
                {sub.aiEnhanceLimit < 999999 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.min(100, (sub.aiEnhancedThisMonth / sub.aiEnhanceLimit) * 100)}%` }}
                    />
                  </div>
                )}
                {sub.tier !== "free" && sub.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    套餐到期：{format(new Date(sub.expiresAt), "yyyy 年 M 月 d 日")}
                  </p>
                )}
                <div className="flex items-center justify-between pt-0.5">
                  {sub.tier === "free" ? (
                    <a href="/pricing" className="text-xs font-semibold text-primary hover:underline">升级以获得更多次数 →</a>
                  ) : (
                    <a href="/pricing" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">管理套餐 →</a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats triple */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <Link href="/entries" className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.entryCount}</span>
              <span className="text-muted-foreground ml-1">日记</span>
            </Link>
            <button onClick={() => setTab("following")} className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">关注</span>
            </button>
            <button onClick={() => setTab("followers")} className="hover:text-primary transition-colors">
              <span className="font-serif font-bold text-foreground text-base">{profile.followerCount}</span>
              <span className="text-muted-foreground ml-1">粉丝</span>
            </button>
            <button onClick={() => setTab("favorites")} className="hover:text-primary transition-colors ml-auto">
              <Heart className="w-3.5 h-3.5 inline text-red-400" />
              <span className="font-serif font-bold text-foreground text-base ml-1">{profile.likesReceived + profile.favoritesReceived}</span>
              <span className="text-muted-foreground ml-1 text-xs">获赞与收藏</span>
            </button>
          </div>

          {/* Quick cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-center">
                <div className="text-lg font-serif font-bold text-foreground">{stats.totalDestinations}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">🗺️ 去过的城市</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-center">
                <div className="text-lg font-serif font-bold text-foreground">{stats.totalTravelDays}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">📅 旅行天数</div>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-xl border border-border/50 bg-card/40 p-3 text-center hover:bg-muted/50 transition-colors group"
              >
                <LogOut className="w-4 h-4 mx-auto text-muted-foreground group-hover:text-destructive transition-colors" />
                <div className="text-[10px] text-muted-foreground mt-1">退出登录</div>
              </button>
            </div>
          )}

          {/* ── Upgrade Banner (free users only) ───────────────────────── */}
          {sub && sub.tier === "free" && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/5 to-amber-50/60 dark:to-amber-900/10">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none mt-0.5">✨</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">升级解锁更多旅行空间</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      无限日记 · 更多照片 · 更多 AI 叙事次数
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setPayDialogTier("pro"); setPayDialogPeriod("monthly"); setShowPayDialog(true); }}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Pro · ¥28/月
                  </button>
                  <button
                    onClick={() => { setPayDialogTier("plus"); setPayDialogPeriod("monthly"); setShowPayDialog(true); }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-500/90 transition-colors"
                  >
                    Plus · ¥68/月
                  </button>
                  <Link href="/pricing" className="flex items-center justify-center px-3 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground hover:bg-muted/40 transition-colors whitespace-nowrap">
                    对比套餐
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Weekly Digest ──────────────────────────────────────────── */}
          <div className="mt-4 p-3 rounded-xl border border-border/40 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">📧 每周旅行回顾</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  {profile.weeklyDigest
                    ? "每周日晚 9 点收到本周日记摘要邮件"
                    : "订阅后每周日收到上周旅行精华摘要"}
                </p>
              </div>
              <button
                onClick={handleToggleDigest}
                className={`relative w-10 h-5.5 rounded-full flex-shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  profile.weeklyDigest ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                style={{ height: "22px", width: "40px" }}
                aria-label="切换每周邮件"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: profile.weeklyDigest ? "translateX(18px)" : "translateX(0)" }}
                />
              </button>
            </div>
            {profile.weeklyDigest && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleSendDigest}
                  disabled={digestSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {digestSending ? (
                    <><span className="inline-block w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> 发送中…</>
                  ) : (
                    <>✉️ 立即发送本周回顾</>
                  )}
                </button>
                {!profile.email && (
                  <span className="text-[11px] text-amber-600">⚠️ 未绑定邮箱</span>
                )}
              </div>
            )}
            {digestToast && (
              <p className="mt-2 text-[11px] text-muted-foreground leading-tight">{digestToast}</p>
            )}
          </div>

          {/* ── Quick Links ────────────────────────────────────────────── */}
          <div className="mt-4 rounded-2xl border border-border/40 bg-card/40 overflow-hidden divide-y divide-border/30">
            {sub && sub.tier !== "free" && (
              <Link href="/pricing">
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">管理套餐</p>
                    <p className="text-[11px] text-muted-foreground">查看当前套餐与续费选项</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            )}
            {([
              { href: "/notifications", Icon: Bell,      label: "消息",     desc: "互动通知与系统消息" },
              { href: "/achievements",  Icon: Award,     label: "旅行成就", desc: "解锁你的专属旅行勋章" },
            ] as const).map(({ href, Icon, label, desc }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            ))}
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">意见反馈</p>
                <p className="text-[11px] text-muted-foreground">告诉我们你的想法或遇到的问题</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          </div>

          {/* ── About / Legal ──────────────────────────────────────────── */}
          <div className="mt-4 rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <BookText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">关于 / 法律信息</span>
            </div>
            <Link href="/terms" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">用户服务协议</p>
                <p className="text-[11px] text-muted-foreground">查看服务条款与用户行为规范</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </Link>
            <Link href="/privacy" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group border-t border-border/30">
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">隐私政策</p>
                <p className="text-[11px] text-muted-foreground">了解我们如何收集和使用您的数据</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </Link>
          </div>

          {/* ── Account & Privacy ──────────────────────────────────────── */}
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-destructive/15">
              <AlertTriangle className="w-4 h-4 text-destructive/70" />
              <span className="text-sm font-semibold text-foreground">账号与隐私</span>
            </div>
            <Link href="/privacy" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">隐私政策</p>
                <p className="text-[11px] text-muted-foreground">了解我们如何收集和使用您的数据</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </Link>
            <Link href="/terms" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group border-t border-border/30">
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">用户服务协议</p>
                <p className="text-[11px] text-muted-foreground">查看服务条款与用户行为规范</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </Link>
            <button
              disabled={exportSummaryLoading}
              onClick={async () => {
                setExportSummaryLoading(true);
                try {
                  const res = await fetch(`${BASE}/api/me/export/summary`, { credentials: "include" });
                  if (res.ok) {
                    const data = await res.json();
                    setExportSummary(data);
                    setShowExportPreview(true);
                  } else {
                    toast({ title: "获取数据失败", description: "请稍后再试", variant: "destructive" });
                  }
                } catch {
                  toast({ title: "网络错误", description: "无法连接服务器，请检查网络后重试", variant: "destructive" });
                } finally { setExportSummaryLoading(false); }
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group text-left border-t border-border/30 disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                {exportSummaryLoading ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : <Download className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">导出我的数据</p>
                <p className="text-[11px] text-muted-foreground">下载所有旅行日记数据（JSON 格式）</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
            <button
              onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(""); setDeleteError(null); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/5 transition-colors group text-left border-t border-border/30"
            >
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-destructive/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive/80">注销账号</p>
                <p className="text-[11px] text-muted-foreground">删除所有旅行日记和账号数据，此操作不可撤销</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          </div>

          {/* ── Travel Preferences ─────────────────────────────────────── */}
          <div ref={prefsPanelRef} className="mt-4 rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">出行偏好</span>
                <span className="text-[11px] text-muted-foreground">· 用于规划行程时的默认设置</span>
              </div>
              <div className="flex items-center gap-2">
                {prefsDebouncing && !prefsSaving && (
                  <span className="text-[11px] text-muted-foreground animate-pulse">待保存…</span>
                )}
                {prefsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                {prefsSaved && !prefsSaving && !prefsDebouncing && (
                  <span className="text-[11px] text-green-600 font-medium">{prefsCleared ? "已清除 ✓" : "已保存 ✓"}</span>
                )}
                {prefsSaveError && !prefsSaving && (
                  <span className="text-[11px] text-destructive font-medium">{prefsSaveError}</span>
                )}
                {prefs && (prefs.travelMode || prefs.budget || prefs.specialNeeds.length > 0 || prefs.fromCity || prefs.travelStyle) && (
                  <button
                    onClick={handleClearPrefs}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    清除全部
                  </button>
                )}
              </div>
            </div>
            {!prefsLoaded ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
              </div>
            ) : (
              <div className="px-4 py-3 space-y-4">
                {/* From city */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">📍 常用出发城市</label>
                  <input
                    type="text"
                    value={prefs?.fromCity ?? ""}
                    onChange={(e) => updatePrefs({ fromCity: e.target.value })}
                    placeholder="例如：上海"
                    className="w-full rounded-lg border border-border/60 bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />
                </div>
                {/* Traveler count */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    👥 默认出行人数：<span className="font-semibold text-foreground">{prefs?.travelers ?? 2} 人</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updatePrefs({ travelers: Math.max(1, (prefs?.travelers ?? 2) - 1) })}
                      disabled={(prefs?.travelers ?? 2) <= 1}
                      className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-sm font-bold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={prefs?.travelers ?? 2}
                      onChange={(e) => updatePrefs({ travelers: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <button
                      onClick={() => updatePrefs({ travelers: Math.min(10, (prefs?.travelers ?? 2) + 1) })}
                      disabled={(prefs?.travelers ?? 2) >= 10}
                      className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-sm font-bold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ＋
                    </button>
                  </div>
                </div>
                {/* Group type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">🧭 出行类型 <span className="font-normal">（可选）</span></label>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_TYPES.map((g) => {
                      const selected = prefs?.groupType === g.value;
                      return (
                        <button
                          key={g.value}
                          onClick={() => updatePrefs({ groupType: selected ? "" : g.value })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? `${g.color} text-white`
                              : `border-border/60 text-muted-foreground ${g.hover} hover:text-foreground`
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Travel mode */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">🚀 出行方式</label>
                  <div className="flex flex-wrap gap-2">
                    {TRAVEL_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => updatePrefs({ travelMode: prefs?.travelMode === m.value ? "" : m.value })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          prefs?.travelMode === m.value
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-border/60 text-muted-foreground hover:border-blue-300 hover:text-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Budget */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">💰 预算档次</label>
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => updatePrefs({ budget: prefs?.budget === b.value ? "" : b.value })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          prefs?.budget === b.value
                            ? "bg-amber-500 text-white border-amber-500"
                            : "border-border/60 text-muted-foreground hover:border-amber-300 hover:text-foreground"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Travel style */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">🎨 旅行风格</label>
                  <div className="flex flex-wrap gap-2">
                    {TRAVEL_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updatePrefs({ travelStyle: prefs?.travelStyle === s ? "" : s })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          prefs?.travelStyle === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Special needs */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">✨ 特殊需求 <span className="font-normal">（可多选）</span></label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_NEEDS.map((n) => {
                      const selected = prefs?.specialNeeds.includes(n.value) ?? false;
                      return (
                        <button
                          key={n.value}
                          onClick={() => updatePrefs({
                            specialNeeds: selected
                              ? (prefs?.specialNeeds ?? []).filter((x) => x !== n.value)
                              : [...(prefs?.specialNeeds ?? []), n.value],
                          })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? "bg-green-500 text-white border-green-500"
                              : "border-border/60 text-muted-foreground hover:border-green-300 hover:text-foreground"
                          }`}
                        >
                          {n.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <div className="mt-6 border-b border-border/40 flex gap-1 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto">
            {([
              ["notes", "笔记", BookText, profile.entryCount],
              ["favorites", "收藏", Bookmark, null],
              ["following", "关注", Users, profile.followingCount],
              ["followers", "粉丝", Users, profile.followerCount],
              ["report", "报告", BarChart2, null],
              ["export", "导出", Download, null],
            ] as const).map(([k, label, Icon, count]) => (
              <button
                key={k}
                onClick={() => setTab(k as Tab)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0",
                  tab === k ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== null && count > 0 && <span className="text-[10px] text-muted-foreground/70">({count})</span>}
                {tab === k && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {/* ── Tab content ────────────────────────────────────────────── */}
          <div className="py-5 pb-24 md:pb-6">
            {tab === "notes" && (
              <NotesGrid notes={notes} loaded={notesLoaded} />
            )}
            {tab === "favorites" && (
              <FavoritesGrid favs={favorites} loaded={favoritesLoaded} />
            )}
            {tab === "following" && (
              <UsersList users={following} loaded={followingLoaded} emptyHint="还没有关注任何旅行者" ctaHref="/square" ctaLabel="去广场发现旅行者" />
            )}
            {tab === "followers" && (
              <UsersList users={followers} loaded={followersLoaded} emptyHint="还没有粉丝 — 多发几篇公开日记吧" ctaHref="/entries/new" ctaLabel="写一篇公开日记" />
            )}
            {tab === "report" && stats && (
              <ReportTab
                stats={stats}
                monthlyData={monthlyData}
                tags={tags}
                recs={recs}
                recsLoading={recsLoading}
                recsLoaded={recsLoaded}
                loaded={statsLoaded}
                onGetRecs={handleGetRecs}
              />
            )}
            {tab === "export" && (
              <ExportTab entries={exportEntries} loaded={exportLoaded} printing={printing} onPrint={handlePrint} />
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditProfileDialog
          initial={profile}
          onClose={() => setEditing(false)}
          onSaved={(p) => { setProfile((prev) => prev ? { ...prev, name: p.name, bio: p.bio } : prev); setEditing(false); }}
        />
      )}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatar={profile.avatar}
          saving={avatarSaving}
          onSelect={handleSelectAvatar}
          onUpload={handleUploadAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}

      {/* ── Export preview modal ─────────────────────────────────────────── */}
      {showPayDialog && (
        <PayDialog
          tier={payDialogTier}
          period={payDialogPeriod}
          onClose={() => setShowPayDialog(false)}
          onSuccess={() => {
            setShowPayDialog(false);
            window.location.reload();
          }}
        />
      )}

      {showExportPreview && exportSummary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-border/40 shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">导出我的数据</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  选择要导出的内容，导出为 JSON 格式
                </p>
              </div>
              <button
                onClick={() => { setShowExportPreview(false); setExportSummary(null); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0 -mt-0.5 -mr-0.5"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 divide-y divide-border/30">
              {([
                { key: "entries" as const, label: "旅行日记", count: `${exportSummary.entryCount} 篇` },
                { key: "photos" as const, label: "照片", count: `${exportSummary.photoCount} 张` },
                { key: "favorites" as const, label: "收藏", count: `${exportSummary.favoriteCount} 篇` },
                { key: "profile" as const, label: "个人资料", count: exportSummary.accountCreatedAt ? format(new Date(exportSummary.accountCreatedAt), "yyyy 年 M 月注册", { locale: zhCN }) : "已设置" },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setExportSections(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${exportSections[key] ? "bg-primary border-primary" : "border-border"}`}>
                      {exportSections[key] && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                    </div>
                    <span className={`text-sm transition-colors ${exportSections[key] ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  <span className={`text-xs transition-colors ${exportSections[key] ? "text-muted-foreground" : "text-muted-foreground/40 line-through"}`}>{count}</span>
                </button>
              ))}
            </div>
            {!Object.values(exportSections).some(Boolean) && (
              <p className="text-xs text-center text-amber-500">请至少选择一项内容</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowExportPreview(false); setExportSummary(null); }}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                取消
              </button>
              <button
                disabled={exportPending || !Object.values(exportSections).some(Boolean)}
                onClick={async () => {
                  setExportPending(true);
                  try {
                    const params = new URLSearchParams();
                    Object.entries(exportSections).forEach(([k, v]) => { if (v) params.append("include", k); });
                    const res = await fetch(`${BASE}/api/me/export?${params.toString()}`, { credentials: "include" });
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `hongshu-export-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowExportPreview(false);
                      setExportSummary(null);
                      toast({ title: "数据已导出", description: "旅行日记数据已下载到本地" });
                    } else {
                      toast({ title: "导出失败", description: "服务器错误，请稍后再试", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "网络错误", description: "无法连接服务器，请检查网络后重试", variant: "destructive" });
                  } finally { setExportPending(false); }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {exportPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />导出中…</> : <><Download className="w-3.5 h-3.5" />确认导出</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-destructive/30 shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">注销账号</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  此操作将永久删除你的所有旅行日记、照片记录和账号数据，且<strong>无法恢复</strong>。
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">请输入 <strong className="text-foreground">注销账号</strong> 以确认</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(null); }}
                placeholder="注销账号"
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive/50"
              />
              {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(""); setDeleteError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                取消
              </button>
              <button
                disabled={deleteConfirmText !== "注销账号" || deletePending}
                onClick={async () => {
                  if (deleteConfirmText !== "注销账号" || deletePending) return;
                  setDeletePending(true);
                  setDeleteError(null);
                  try {
                    const res = await fetch(`${BASE}/api/me/account`, { method: "DELETE", credentials: "include" });
                    if (res.ok) {
                      await signOut();
                    } else {
                      setDeleteError("注销失败，请稍后重试");
                    }
                  } catch {
                    setDeleteError("网络错误，请稍后重试");
                  } finally {
                    setDeletePending(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {deletePending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />注销中…</> : <><Trash2 className="w-3.5 h-3.5" />确认注销</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const MOOD_COLORS: Record<string, string> = {
  开心: "#fbbf24", 平静: "#60a5fa", 感动: "#f472b6",
  疲惫: "#9ca3af", 兴奋: "#fb923c", 思念: "#a78bfa",
};
const MOOD_EMOJI: Record<string, string> = {
  开心: "😄", 平静: "😌", 感动: "🥹", 疲惫: "😴", 兴奋: "🤩", 思念: "💭", 伤感: "😢", 惊喜: "😲",
};
const BAR_COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#f59e0b","#14b8a6","#ef4444","#84cc16","#6366f1","#fb923c","#a78bfa"];

function StatsTab({
  stats, monthlyData, loaded,
}: {
  stats: SummaryStats;
  monthlyData: MonthlyData[];
  loaded: boolean;
}) {
  const maxCount = Math.max(...monthlyData.map((d) => d.count), 1);

  const cards = [
    { icon: "📓", value: stats.totalEntries, label: "篇日记" },
    { icon: "📅", value: stats.totalTravelDays, label: "天旅途" },
    { icon: "🗺️", value: stats.totalDestinations, label: "个目的地" },
    { icon: "📷", value: stats.totalPhotos, label: "张照片" },
    ...(stats.longestTripDays > 0 ? [{ icon: "✈️", value: stats.longestTripDays, label: "天最长旅行" }] : []),
    ...(stats.avgRating ? [{ icon: "⭐", value: stats.avgRating.toFixed(1), label: "平均评分" }] : []),
  ];

  if (!loaded) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  }

  return (
    <div className="space-y-8 py-2">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border/40 bg-card/60 p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-serif font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly activity bar chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">📈 最近 12 个月记录频率</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v} 篇`, "日记"]}
                labelFormatter={(l: string) => `${l.slice(0, 4)}年${l.slice(5)}月`}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlyData.map((d) => (
                  <Cell
                    key={d.month}
                    fill={d.count === maxCount ? "#f97316" : "#fed7aa"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top destinations */}
      {stats.topDestinations.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">🏆 最常去的目的地</h3>
          <div className="space-y-3">
            {stats.topDestinations.map((d, i) => (
              <div key={d.destination} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{d.destination}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{d.count} 篇</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(d.count / stats.topDestinations[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood distribution */}
      {stats.moodCounts.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">😊 旅途心情分布</h3>
          <div className="flex flex-wrap gap-2">
            {stats.moodCounts.map((m) => (
              <div
                key={m.mood}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: (MOOD_COLORS[m.mood] ?? "#9ca3af") + "22",
                  color: MOOD_COLORS[m.mood] ?? "#9ca3af",
                  border: `1px solid ${(MOOD_COLORS[m.mood] ?? "#9ca3af")}44`,
                }}
              >
                <span>{m.mood}</span>
                <span className="font-bold">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalEntries === 0 && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <div className="text-4xl">✈️</div>
          <p className="text-sm text-muted-foreground">还没有旅行记录，快去写第一篇日记吧！</p>
          <Link href="/entries/new" className="text-primary text-sm hover:underline">写日记 →</Link>
        </div>
      )}
    </div>
  );
}

function NotesGrid({ notes, loaded }: { notes: MyEntry[]; loaded: boolean }) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (notes.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">📓</div>
      <p className="text-sm text-muted-foreground">还没有写过日记</p>
      <Link href="/entries/new" className="text-primary text-sm hover:underline">写第一篇 →</Link>
    </div>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {notes.map((n) => (
        <Link key={n.id} href={`/entries/${n.id}`}>
          <div className="rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-md transition-all group cursor-pointer">
            <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
              {n.coverImage ? (
                <img src={n.coverImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[10px] text-foreground">
                {VIS_ICON[n.visibility]}
              </div>
              {n.mood && (
                <div className={cn("absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium", MOODS[n.mood] ?? "bg-muted text-muted-foreground")}>
                  {n.mood}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{n.title}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{n.destination}</span>
                <span className="ml-auto">{format(new Date(n.startDate), "MM.dd")}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function FavoritesGrid({ favs, loaded }: { favs: FavEntry[]; loaded: boolean }) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (favs.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">📚</div>
      <p className="text-sm text-muted-foreground">还没有收藏</p>
      <Link href="/square" className="text-primary text-sm hover:underline">去广场看看 →</Link>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {favs.map((f) => (
          <Link key={f.id} href={`/public/${f.id}`}>
            <div className="rounded-xl overflow-hidden bg-card border border-border/40 hover:shadow-md transition-all group cursor-pointer">
              <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
                {f.coverPhotoUrl ? (
                  <img src={f.coverPhotoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-amber-100/90 text-amber-600">
                  <Bookmark className="w-3 h-3 fill-amber-500" />
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{f.title}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{f.destination}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/favorites" className="block text-center text-xs text-primary hover:underline mt-4">
        查看全部收藏 →
      </Link>
    </>
  );
}

function UsersList({ users, loaded, emptyHint, ctaHref, ctaLabel }: {
  users: FollowItem[];
  loaded: boolean;
  emptyHint: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/60" /></div>;
  if (users.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-2xl">👥</div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {users.map((u) => (
        <Link key={u.userId} href={`/users/${u.userId}`}>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-card/80 transition-colors cursor-pointer">
            <div className="w-11 h-11 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-base font-semibold text-primary">
              {u.avatar ? <img src={u.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">旅行者</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function EditProfileDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: MyProfile;
  onClose: () => void;
  onSaved: (p: { name: string; bio: string | null }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio }),
      });
      if (res.ok) {
        const d = await res.json();
        onSaved({ name: d.name, bio: d.bio });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-foreground">编辑主页</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">昵称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">个人简介</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="用一句话介绍你自己..."
              className="mt-1 resize-none"
            />
            <p className="text-[10px] text-muted-foreground/70 text-right mt-1">{bio.length}/120</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AvatarPickerModal({
  currentAvatar,
  saving,
  onSelect,
  onUpload,
  onClose,
}: {
  currentAvatar: string | null;
  saving: boolean;
  onSelect: (url: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"preset" | "upload" | "ai">("preset");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch(`${BASE}/api/ai/avatar/ai-suggest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt.trim() }),
      });
      if (res.ok) {
        const { url } = await res.json();
        onSelect(url);
      } else {
        setAiError("生成失败，请重试");
      }
    } catch {
      setAiError("网络错误，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const TABS = [
    { id: "preset" as const, label: "卡通形象", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "upload" as const, label: "上传图片", icon: <Upload className="w-3.5 h-3.5" /> },
    { id: "ai"     as const, label: "AI 生成",  icon: <Wand2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-base font-serif font-bold text-foreground">更换头像</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border/40">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Preset tab */}
        {tab === "preset" && (
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => onSelect(p.url)}
                  disabled={saving}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                    p.bg,
                    currentAvatar === p.url ? "border-primary shadow-md" : "border-transparent hover:border-primary/40"
                  )}
                >
                  <img src={p.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain p-1" />
                  {currentAvatar === p.url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {saving && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />保存中…
              </div>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="p-5 space-y-4">
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 py-10 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30",
              saving && "pointer-events-none opacity-60"
            )}>
              {saving
                ? <Loader2 className="w-8 h-8 animate-spin text-primary" />
                : <Upload className="w-8 h-8 text-muted-foreground" />
              }
              <span className="text-sm text-muted-foreground">
                {saving ? "上传中…" : "点击选择图片"}
              </span>
              <span className="text-xs text-muted-foreground/60">支持 JPG、PNG、WebP，建议正方形</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
        )}

        {/* AI generate tab */}
        {tab === "ai" && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              描述你的风格或喜好，AI 将为你生成一个专属卡通头像。
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="例如：喜欢旅行的女生、戴眼镜的程序员、可爱的机器人探险家…"
              rows={3}
              className="w-full rounded-xl border border-border/60 bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
            />
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || aiLoading || saving}
              className="w-full gap-2"
            >
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />生成中…</> : <><Wand2 className="w-4 h-4" />AI 生成头像</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ReportTab ────────────────────────────────────────────────────────────── */
function ReportTab({
  stats, monthlyData, tags, recs, recsLoading, recsLoaded, loaded, onGetRecs,
}: {
  stats: SummaryStats;
  monthlyData: MonthlyData[];
  tags: { name: string; count: number }[];
  recs: { name: string; country: string; reason: string; emoji: string; tags: string[] }[];
  recsLoading: boolean;
  recsLoaded: boolean;
  loaded: boolean;
  onGetRecs: () => void;
}) {
  const year = new Date().getFullYear();
  const thisYearMonths = monthlyData.filter(m => m.month.startsWith(String(year)));
  const thisYearTotal = thisYearMonths.reduce((s, m) => s + m.count, 0);
  const peakMonth = [...monthlyData].sort((a, b) => b.count - a.count)[0];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />加载中…
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="text-center pt-4 space-y-0.5">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="logo" decoding="async" className="w-10 h-10 object-contain mx-auto mb-1" />
        <h2 className="text-lg font-bold">{year} 旅行报告</h2>
        <p className="text-xs text-muted-foreground">你的全部旅行足迹一览</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {[
          { icon: <BookText className="w-4 h-4" />, label: "旅行日记", value: stats.totalEntries, sub: "篇" },
          { icon: <MapPin className="w-4 h-4" />, label: "到访目的地", value: stats.totalDestinations, sub: "个" },
          { icon: <CalendarDays className="w-4 h-4" />, label: "累计旅行天数", value: stats.totalTravelDays, sub: "天" },
          { icon: <Camera className="w-4 h-4" />, label: "上传照片", value: stats.totalPhotos, sub: "张" },
          ...(stats.longestTripDays ? [{ icon: <Award className="w-4 h-4" />, label: "最长单次旅行", value: stats.longestTripDays, sub: "天" }] : []),
          ...(stats.avgRating ? [{ icon: <Star className="w-4 h-4" />, label: "平均评分", value: `${stats.avgRating} ★`, sub: "满分 5 分" }] : []),
          ...(thisYearTotal > 0 ? [{ icon: <TrendingUp className="w-4 h-4" />, label: `${year} 年写了`, value: thisYearTotal, sub: "篇日记" }] : []),
        ].map(({ icon, label, value, sub }) => (
          <div key={label} className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      {monthlyData.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">近 12 个月发布趋势</span>
          </div>
          {peakMonth && peakMonth.count > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              最活跃月份：{peakMonth.month.replace("-", " 年 ")} 月，共 {peakMonth.count} 篇
            </p>
          )}
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyData} barSize={14}>
              <XAxis dataKey="month" tickFormatter={v => v.slice(5)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [`${v} 篇`, "日记"]}
                labelFormatter={l => `${l.replace("-", " 年 ")} 月`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top destinations */}
      {stats.topDestinations && stats.topDestinations.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">最常去的地方 Top 5</span>
          </div>
          <div className="space-y-2">
            {stats.topDestinations.map((d, i) => {
              const max = stats.topDestinations[0].count;
              return (
                <div key={d.destination} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 text-right font-mono">{i + 1}</span>
                  <span className="text-sm flex-1 truncate">{d.destination}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{d.count} 篇</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mood breakdown */}
      {stats.moodCounts && stats.moodCounts.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Smile className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">旅行心情</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.moodCounts.map(({ mood, count }) => (
              <div
                key={mood}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${MOOD_COLORS[mood] ?? "#6b7280"}18`,
                  borderColor: `${MOOD_COLORS[mood] ?? "#6b7280"}40`,
                  color: MOOD_COLORS[mood] ?? "#6b7280",
                }}
              >
                <span>{MOOD_EMOJI[mood] ?? "🙂"}</span>
                <span>{mood}</span>
                <span className="opacity-60">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags cloud */}
      {tags.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">我的旅行标签</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={tag.name}
                className="px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${BAR_COLORS[i % BAR_COLORS.length]}18`,
                  borderColor: `${BAR_COLORS[i % BAR_COLORS.length]}40`,
                  color: BAR_COLORS[i % BAR_COLORS.length],
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI recommendations */}
      {stats.totalEntries > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold">AI 目的地推荐</span>
            </div>
            {!recsLoaded && (
              <Button size="sm" variant="outline" onClick={onGetRecs} disabled={recsLoading} className="gap-1.5 text-xs">
                {recsLoading ? <><Loader2 size={12} className="animate-spin" />生成中…</> : "基于旅行历史推荐"}
              </Button>
            )}
          </div>
          {!recsLoaded && !recsLoading && (
            <p className="text-xs text-muted-foreground">点击按钮，AI 将根据你的旅行历史为你推荐 3 个可能喜欢的新目的地</p>
          )}
          {recsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 size={16} className="animate-spin text-orange-500" />AI 正在分析你的旅行偏好…
            </div>
          )}
          {recsLoaded && recs.length === 0 && (
            <p className="text-sm text-muted-foreground">暂时无法生成推荐，请稍后再试</p>
          )}
          {recsLoaded && recs.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              {recs.map((rec, i) => (
                <div key={i} className="rounded-xl border border-border/40 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{rec.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{rec.name}</div>
                      <div className="text-xs text-muted-foreground">{rec.country}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  {rec.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {stats.totalEntries === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">还没有旅行日记，快去写第一篇吧～</div>
      )}
    </div>
  );
}

/* ── ExportTab ────────────────────────────────────────────────────────────── */
function ExportTab({
  entries, loaded, printing, onPrint,
}: {
  entries: any[];
  loaded: boolean;
  printing: boolean;
  onPrint: () => void;
}) {
  const totalWords = entries.reduce((acc, e) => acc + (e.content?.length ?? 0), 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { page-break-after: always; }
          .print-cover { page-break-after: always; background: linear-gradient(135deg, #f97316, #fb923c); color: white; }
        }
      `}</style>

      <div className="space-y-4 pb-6 no-print">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-base font-bold">导出全部日记</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!loaded ? "加载中…" : `${entries.length} 篇日记 · 约 ${totalWords.toLocaleString()} 字`}
            </p>
          </div>
          <Button variant="outline" onClick={onPrint} disabled={!loaded || printing} className="gap-2 text-sm">
            <Printer size={15} />
            {printing ? "准备中…" : "打印 / 存为 PDF"}
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 leading-relaxed">
          <strong>使用提示：</strong>点击「打印 / 存为 PDF」，在打印对话框中选择「另存为 PDF」，即可将旅行日记保存为精美 PDF 书册。
        </div>

        {!loaded ? (
          <div className="flex items-center gap-3 justify-center py-14 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" /><span className="text-sm">加载日记中…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground text-sm">还没有旅行日记，快去写第一篇吧～</div>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 5).map(e => (
              <div key={e.id} className="bg-card border border-border/40 rounded-2xl p-3.5 flex gap-3.5 shadow-sm">
                {e.coverPhoto && (
                  <img src={e.coverPhoto} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">📍 {e.destination}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(e.date), "yyyy年M月d日", { locale: zhCN })}
                    {e.mood && <span className="ml-2">{MOOD_EMOJI[e.mood] ?? ""} {e.mood}</span>}
                  </div>
                </div>
              </div>
            ))}
            {entries.length > 5 && (
              <p className="text-center text-xs text-muted-foreground">… 还有 {entries.length - 5} 篇（打印时包含全部）</p>
            )}
          </div>
        )}
      </div>

      <div className="hidden print:block">
        <div className="print-cover min-h-screen flex flex-col items-center justify-center text-center p-12">
          <div className="flex justify-center mb-6"><img src="/logo.png" alt="顽童日记" className="w-24 h-24 object-contain rounded-2xl" /></div>
          <h1 className="text-5xl font-bold mb-4">我的旅行日记</h1>
          <p className="text-xl opacity-80">{entries.length} 篇旅行故事</p>
          <p className="text-lg opacity-60 mt-2">共 {totalWords.toLocaleString()} 字</p>
          <p className="text-base opacity-50 mt-8">{new Date().getFullYear()} 年导出</p>
        </div>
        {entries.map((e, idx) => (
          <div key={e.id} className="print-page p-10 min-h-screen">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="text-gray-400 text-sm mb-1">第 {idx + 1} 篇</div>
              <h2 className="text-3xl font-bold">{e.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                <span>📍 {e.destination}</span>
                <span>{format(new Date(e.date), "yyyy年M月d日", { locale: zhCN })}</span>
                {e.mood && <span>{MOOD_EMOJI[e.mood] ?? ""} {e.mood}</span>}
                {e.rating && <span>{"⭐".repeat(e.rating)}</span>}
              </div>
            </div>
            {e.coverPhoto && (
              <img src={e.coverPhoto} alt="" loading="lazy" decoding="async" className="w-full max-h-64 object-cover rounded-xl mb-6" />
            )}
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
              {e.content ?? "（无正文）"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
const FEEDBACK_TYPES = [
  { value: "bug",        emoji: "🐛", label: "Bug 反馈" },
  { value: "suggestion", emoji: "💡", label: "功能建议" },
  { value: "praise",     emoji: "👍", label: "表扬一下" },
  { value: "other",      emoji: "💬", label: "其他" },
];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("suggestion");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "提交失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-foreground">意见反馈</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-base font-semibold text-foreground">感谢你的反馈！</p>
            <p className="text-sm text-muted-foreground">我们会认真阅读每一条意见 🙏</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              关闭
            </button>
          </div>
        ) : (
          <>
            {/* Type selector */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">反馈类型</p>
              <div className="grid grid-cols-4 gap-2">
                {FEEDBACK_TYPES.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-colors ${
                      type === value
                        ? "border-primary bg-primary/8 text-primary font-semibold"
                        : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg leading-none">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">详细描述</p>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请描述你遇到的问题或建议..."
                maxLength={500}
                rows={4}
                className="resize-none text-sm"
              />
              <p className="text-[10px] text-muted-foreground/60 text-right mt-1">{content.length}/500</p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending || !content.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "提交反馈"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
