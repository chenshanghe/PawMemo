import React, { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, X, Loader2, MapPin, Plane, Train, Hotel, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";

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
const today = new Date().toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

interface PlaceCard { place?: string; name?: string; description: string; duration?: string; tips?: string; cuisine?: string; coords?: { lat: number; lng: number } | null; dianpingUrl?: string; gaodeUrl?: string; }
interface DayPlan { day: number; date: string; city: string; theme: string; morning: PlaceCard; afternoon: PlaceCard; lunch: PlaceCard; dinner: PlaceCard; }
interface BookingLink { name: string; url: string; }
interface PlanResult {
  title: string; summary: string; cities: string[]; days: DayPlan[];
  transport: { from: string; to: string; mode: string; recommendation: string }[];
  tips: string[];
  booking: { flights: { outbound: BookingLink[]; return: BookingLink[] }; trains: { name: string; url: string }[]; hotels: { city: string; links: BookingLink[] }[] };
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

export default function PlanPage() {
  const [state, setState] = useState<"form" | "generating" | "result">("form");
  const [from, setFrom] = useState("");
  const [destinations, setDestinations] = useState<string[]>([""]); 
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState("文化探索");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState<"morning" | "afternoon" | null>(null);
  const dayTabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSelectedPoi(null); }, [activeDay]);

  const addDestination = () => setDestinations(d => [...d, ""]);
  const removeDestination = (i: number) => setDestinations(d => d.filter((_, idx) => idx !== i));
  const updateDestination = (i: number, v: string) => setDestinations(d => d.map((x, idx) => idx === i ? v : x));

  const handleGenerate = async () => {
    const filledDests = destinations.filter(d => d.trim());
    if (!from.trim() || !filledDests.length) { setError("请填写出发城市和目的地"); return; }
    setError(null);
    setState("generating");
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.trim(), destinations: filledDests, startDate, endDate, travelers, style }),
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

  const day = result?.days[activeDay];
  const dayCoords: [number, number][] = day
    ? [day.morning?.coords, day.afternoon?.coords].filter(Boolean).map(c => [c!.lat, c!.lng])
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
          {state === "result" && (
            <button onClick={() => setState("form")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />重新规划
            </button>
          )}
        </div>

        {/* ── Form ── */}
        {state === "form" && (
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/90 to-orange-400 px-5 py-4">
              <p className="text-sm font-semibold text-white">✈️ 告诉我你的旅行计划</p>
              <p className="text-xs text-white/70 mt-0.5">支持国内及出境路线，AI 推荐中国特色平台预订</p>
            </div>
            <div className="p-5 space-y-4">
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
                <h3 className="text-lg font-serif font-bold">{result.title}</h3>
                <p className="text-sm text-white/80 mt-1">{result.summary}</p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {result.cities.map(c => (
                    <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">📍 {c}</span>
                  ))}
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
                      <TileLayer attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
                      <MapFit coords={dayCoords} />
                      {day.morning?.coords && (
                        <Marker
                          position={[day.morning.coords.lat, day.morning.coords.lng]}
                          icon={makePinIcon("上午", dayColor(activeDay))}
                          eventHandlers={{ click: () => { setSelectedPoi("morning"); document.getElementById("plan-morning")?.scrollIntoView({ behavior: "smooth", block: "center" }); } }}
                        >
                          <Popup><p className="font-medium text-sm">{day.morning.place}</p></Popup>
                        </Marker>
                      )}
                      {day.afternoon?.coords && (
                        <Marker
                          position={[day.afternoon.coords.lat, day.afternoon.coords.lng]}
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
