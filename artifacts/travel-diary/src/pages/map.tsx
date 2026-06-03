import React, { useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { useListEntries } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { MapPin, LayoutGrid, Route } from "lucide-react";
import { format } from "date-fns";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from "react-simple-maps";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import worldData from "@/assets/world-110m.json";

const TRIP_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#f59e0b", "#14b8a6", "#ef4444",
]; // react-simple-maps v2

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

export default function MapPage() {
  const [, navigate] = useLocation();
  const { data: allEntries, isLoading } = useListEntries({});
  const [view, setView] = useState<"scatter" | "route">("scatter");
  const [selected, setSelected] = useState<any[] | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([20, 10]);
  const mapRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat != null && e.lng != null),
    [allEntries],
  );
  const noCoords = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat == null || e.lng == null),
    [allEntries],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const key = `${(e as any).lat?.toFixed(4)},${(e as any).lng?.toFixed(4)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  const trips = useMemo(() => clusterTrips(entries), [entries]);

  function handleMarkerEnter(e: React.MouseEvent, group: any[]) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelected(group);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!selected) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <Layout>
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">足迹地图</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "加载中…"
                : `${entries.length} 个地点已标记${noCoords.length > 0 ? `，${noCoords.length} 篇随记未设定坐标` : ""}`}
            </p>
          </div>
          {entries.length > 1 && (
            <div className="flex items-center rounded-xl border border-border/60 overflow-hidden">
              <button
                onClick={() => setView("scatter")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "scatter" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />散点
              </button>
              <button
                onClick={() => setView("route")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border/60 transition-colors ${
                  view === "route" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Route className="w-3.5 h-3.5" />路线
              </button>
            </div>
          )}
        </div>

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
        <div
          ref={mapRef}
          className="relative rounded-2xl overflow-hidden border border-border/50 shadow-sm"
          style={{ height: "60vh", minHeight: 340, background: "#c8dff0" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setSelected(null); setTooltipPos(null); }}
        >
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 175 }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
                setZoom(z);
                setCenter(coordinates);
              }}
            >
              <Geographies geography={worldData}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#e8e0d5"
                      stroke="#c4b49f"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#ddd4c7" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {view === "scatter" && [...grouped.entries()].map(([key, group]) => {
                const first = group[0] as any;
                const count = group.length;
                return (
                  <Marker
                    key={key}
                    coordinates={[first.lng, first.lat]}
                    onMouseEnter={(e: any) => handleMarkerEnter(e, group)}
                    onClick={() => { if (count === 1) navigate(`/entries/${first.id}`); }}
                  >
                    <circle
                      r={(count > 1 ? 10 : 7) / zoom}
                      fill="#c2410c"
                      stroke="white"
                      strokeWidth={2.5 / zoom}
                      style={{ cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.3))" }}
                    />
                    {count > 1 && (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={9 / zoom}
                        fontWeight="bold"
                        style={{ pointerEvents: "none" }}
                      >
                        {count}
                      </text>
                    )}
                  </Marker>
                );
              })}

              {view === "route" && trips.map((trip, ti) => {
                const color = TRIP_COLORS[ti % TRIP_COLORS.length];
                const sorted = [...trip].sort(
                  (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
                );
                return (
                  <React.Fragment key={ti}>
                    {sorted.slice(0, -1).map((_: any, ei: number) => (
                      <Line
                        key={ei}
                        from={[sorted[ei].lng, sorted[ei].lat]}
                        to={[sorted[ei + 1].lng, sorted[ei + 1].lat]}
                        stroke={color}
                        strokeWidth={2 / zoom}
                        strokeOpacity={0.75}
                        strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                      />
                    ))}
                    {sorted.map((e: any, ei: number) => (
                      <Marker
                        key={e.id}
                        coordinates={[e.lng, e.lat]}
                        onMouseEnter={(evt: any) => handleMarkerEnter(evt, [e])}
                        onClick={() => navigate(`/entries/${e.id}`)}
                      >
                        <circle r={10 / zoom} fill={color} stroke="white" strokeWidth={2.5 / zoom} style={{ cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.25))" }} />
                        <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={9 / zoom} fontWeight="bold" style={{ pointerEvents: "none" }}>
                          {ei + 1}
                        </text>
                      </Marker>
                    ))}
                  </React.Fragment>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
            <button
              onClick={() => setZoom(z => Math.min(z * 1.5, 16))}
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-border/60 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z / 1.5, 1))}
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-border/60 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => { setZoom(1); setCenter([20, 10]); }}
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-border/60 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
              title="重置视图"
            >
              <Maximize2 className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>

          {selected && tooltipPos && (
            <div
              className="absolute z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/60 p-3 space-y-2 max-w-[220px]"
              style={{
                left: Math.min(tooltipPos.x + 14, (mapRef.current?.offsetWidth ?? 400) - 240),
                top: Math.max(8, tooltipPos.y - 12),
              }}
            >
              {selected.map((e: any) => (
                <Link key={e.id} href={`/entries/${e.id}`}>
                  <div className="border-b border-gray-100 last:border-0 pb-2 last:pb-0 hover:bg-muted/30 rounded-lg px-1 -mx-1 cursor-pointer transition-colors">
                    <p className="font-semibold text-sm leading-tight text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">📍 {e.destination}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(e.startDate), "yyyy.MM.dd")}</p>
                    <span className="text-xs text-primary font-medium mt-0.5 block">点击查看 →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Route timeline */}
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
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                            {ei + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{e.title}</p>
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
