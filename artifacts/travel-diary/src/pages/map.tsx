import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { useListEntries } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, LayoutGrid, Route } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TRIP_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#f59e0b", "#14b8a6", "#ef4444",
];

function makeIcon(count: number, color = "#c2410c") {
  const size = count > 1 ? 36 : 30;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:${count > 1 ? 13 : 0}px;
      font-family:sans-serif;cursor:pointer;
    ">${count > 1 ? count : ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function makeStopIcon(color: string, index: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.30);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:11px;
      font-family:sans-serif;cursor:pointer;
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

function clusterTrips(entries: any[]): any[][] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const trips: any[][] = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevEnd = prev.endDate ? new Date(prev.endDate) : new Date(prev.startDate);
    const currStart = new Date(curr.startDate);
    const gapDays = (currStart.getTime() - prevEnd.getTime()) / 86400000;
    if (gapDays <= 7) {
      current.push(curr);
    } else {
      trips.push(current);
      current = [curr];
    }
  }
  trips.push(current);
  return trips;
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 7, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], animate: true });
    }
  }, [coords.length]);
  return null;
}

export default function MapPage() {
  const { data: allEntries, isLoading } = useListEntries({});
  const [view, setView] = useState<"scatter" | "route">("scatter");

  const entries = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat != null && e.lng != null),
    [allEntries],
  );
  const noCoords = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat == null || e.lng == null),
    [allEntries],
  );

  // Scatter: group by location
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = `${(e as any).lat?.toFixed(4)},${(e as any).lng?.toFixed(4)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  // Route: trip clusters
  const trips = useMemo(() => clusterTrips(entries), [entries]);

  const coords: [number, number][] = useMemo(
    () => entries.map((e: any) => [e.lat, e.lng]),
    [entries],
  );

  const defaultCenter: [number, number] = [35, 105];

  return (
    <Layout>
      <div className="space-y-4 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">足迹地图</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "加载中…"
                : `${entries.length} 个地点已标记${noCoords.length > 0 ? `，${noCoords.length} 篇随记未设定坐标` : ""}`}
            </p>
          </div>

          {/* View toggle */}
          {entries.length > 1 && (
            <div className="flex items-center rounded-xl border border-border/60 overflow-hidden">
              <button
                onClick={() => setView("scatter")}
                title="散点模式"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "scatter" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                散点
              </button>
              <button
                onClick={() => setView("route")}
                title="路线模式"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border/60 transition-colors ${
                  view === "route" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                路线
              </button>
            </div>
          )}
        </div>

        {/* Route legend */}
        {view === "route" && trips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trips.map((trip, ti) => (
              <div key={ti} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: TRIP_COLORS[ti % TRIP_COLORS.length] }} />
                第 {ti + 1} 段旅程（{trip.length} 站）
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ height: "60vh", minHeight: 340 }}>
          <MapContainer center={defaultCenter} zoom={4} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
            <FitBounds coords={coords} />

            {/* Scatter mode */}
            {view === "scatter" && [...grouped.entries()].map(([key, group]) => {
              const first = group[0] as any;
              return (
                <Marker
                  key={key}
                  position={[first.lat, first.lng]}
                  icon={makeIcon(group.length)}
                  eventHandlers={{ click: () => {} }}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[180px]">
                      {group.map((e: any) => (
                        <div key={e.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                          <p className="font-semibold text-sm leading-tight">{e.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📍 {e.destination}</p>
                          <p className="text-xs text-gray-400">{format(new Date(e.startDate), "yyyy.MM.dd")}</p>
                          <a href={`/entries/${e.id}`} className="text-xs text-orange-600 hover:underline font-medium mt-1 inline-block">
                            查看随记 →
                          </a>
                        </div>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Route mode: polylines + numbered stops */}
            {view === "route" && trips.map((trip, ti) => {
              const color = TRIP_COLORS[ti % TRIP_COLORS.length];
              const positions: [number, number][] = trip.map((e: any) => [e.lat, e.lng]);
              return (
                <React.Fragment key={ti}>
                  {positions.length > 1 && (
                    <Polyline
                      positions={positions}
                      pathOptions={{ color, weight: 3, opacity: 0.85, dashArray: "10 6" }}
                    />
                  )}
                  {trip.map((e: any, ei: number) => (
                    <Marker
                      key={e.id}
                      position={[e.lat, e.lng]}
                      icon={makeStopIcon(color, ei)}
                    >
                      <Popup>
                        <div className="min-w-[160px]">
                          <p className="font-semibold text-sm">{e.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📍 {e.destination}</p>
                          <p className="text-xs text-gray-400">{format(new Date(e.startDate), "yyyy.MM.dd")}</p>
                          <a href={`/entries/${e.id}`} className="text-xs text-orange-600 hover:underline font-medium mt-1 inline-block">
                            查看随记 →
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Route timeline list */}
        {view === "route" && trips.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">旅行时间线</h3>
            {trips.map((trip, ti) => {
              const color = TRIP_COLORS[ti % TRIP_COLORS.length];
              const sorted = [...trip].sort(
                (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
              );
              return (
                <div key={ti} className="relative pl-5">
                  {/* Vertical line */}
                  <div className="absolute left-1.5 top-5 bottom-0 w-0.5 rounded-full" style={{ backgroundColor: color + "44" }} />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 -ml-0.5" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      第 {ti + 1} 段旅程 · {sorted.length} 站
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sorted.map((e: any, ei: number) => (
                      <Link key={e.id} href={`/entries/${e.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group ml-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {ei + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {e.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.destination} · {format(new Date(e.startDate), "MM.dd")}
                              {e.endDate ? ` — ${format(new Date(e.endDate), "MM.dd")}` : ""}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center space-y-2">
            <div className="text-4xl">🗺️</div>
            <p className="text-sm font-medium text-foreground">还没有标记地点</p>
            <p className="text-xs text-muted-foreground">写随记时填写目的地，系统会自动解析坐标并标记在地图上</p>
            <Link href="/entries/new">
              <button className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                写第一篇随记
              </button>
            </Link>
          </div>
        )}

        {/* No-coords list */}
        {noCoords.length > 0 && entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">未解析坐标的随记</p>
            <div className="grid gap-2">
              {noCoords.slice(0, 6).map((e: any) => (
                <Link key={e.id} href={`/entries/${e.id}/edit`}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30 transition-colors cursor-pointer">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.destination}</p>
                    </div>
                    <span className="text-xs text-primary font-medium shrink-0">重新编辑 →</span>
                  </div>
                </Link>
              ))}
              {noCoords.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">还有 {noCoords.length - 6} 篇…</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
