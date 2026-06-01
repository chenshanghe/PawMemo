import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Loader2, Trash2, Navigation, MapPin, Calendar, Users, ChevronRight } from "lucide-react";

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
  createdAt: string;
}

function groupByMonth(plans: SavedPlan[]): { label: string; items: SavedPlan[] }[] {
  const map = new Map<string, SavedPlan[]>();
  for (const p of plans) {
    const key = p.createdAt.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: key.replace("-", " 年 ") + " 月",
    items,
  }));
}

export default function PlanListPage() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/plan/saved")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPlans(data); setLoading(false); })
      .catch(() => { setError("加载失败，请刷新重试"); setLoading(false); });
  }, []);

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

  const groups = groupByMonth(plans);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">我的规划</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "加载中…" : `共 ${plans.length} 份保存的行程`}
            </p>
          </div>
          <Link href="/plan">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
              <Navigation className="w-3.5 h-3.5" />新规划
            </button>
          </Link>
        </div>

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
                      {/* Color accent */}
                      <div className="w-1.5 rounded-full bg-gradient-to-b from-primary to-orange-400 self-stretch shrink-0 min-h-[48px]" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                            {plan.title}
                          </h3>
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
                              {plan.budget.split("（")[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
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
