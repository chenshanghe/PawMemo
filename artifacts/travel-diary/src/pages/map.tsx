import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { useListEntries } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, CalendarDays, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function makeIcon(count: number) {
  const size = count > 1 ? 36 : 30;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:hsl(11,67%,55%);border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:${count > 1 ? 13 : 0}px;
      font-family:sans-serif;cursor:pointer;
    ">${count > 1 ? count : ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
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
  const [activeId, setActiveId] = useState<number | null>(null);

  const entries = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat != null && e.lng != null),
    [allEntries]
  );

  const noCoords = useMemo(
    () => (allEntries ?? []).filter((e: any) => e.lat == null || e.lng == null),
    [allEntries]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = `${(e as any).lat?.toFixed(4)},${(e as any).lng?.toFixed(4)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  const coords: [number, number][] = useMemo(
    () => entries.map((e: any) => [e.lat, e.lng]),
    [entries]
  );

  const defaultCenter: [number, number] = [35, 105];

  return (
    <Layout>
      <div className="space-y-4 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">足迹地图</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading
              ? "加载中…"
              : `${entries.length} 个地点已标记${noCoords.length > 0 ? `，${noCoords.length} 篇随记未设定坐标` : ""}`}
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ height: "60vh", minHeight: 340 }}>
          <MapContainer
            center={defaultCenter}
            zoom={4}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds coords={coords} />

            {[...grouped.entries()].map(([key, group]) => {
              const first = group[0] as any;
              return (
                <Marker
                  key={key}
                  position={[first.lat, first.lng]}
                  icon={makeIcon(group.length)}
                  eventHandlers={{ click: () => setActiveId(first.id) }}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[180px]">
                      {group.map((e: any) => (
                        <div key={e.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                          <p className="font-semibold text-sm leading-tight">{e.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <span>📍</span>{e.destination}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(e.startDate), "yyyy.MM.dd")}
                          </p>
                          <a
                            href={`/entries/${e.id}`}
                            className="text-xs text-orange-600 hover:underline font-medium mt-1 inline-block"
                          >
                            查看随记 →
                          </a>
                        </div>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {entries.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center space-y-2">
            <div className="text-4xl">🗺️</div>
            <p className="text-sm font-medium text-foreground">还没有标记地点</p>
            <p className="text-xs text-muted-foreground">
              写随记时填写目的地，系统会自动解析坐标并标记在地图上
            </p>
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
