import React, { useState, useDeferredValue } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useListEntries, useListTags, useDeleteEntry, getListEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  MapPin, CalendarDays, Image as ImageIcon, Search, Plus, X,
  MoreHorizontal, Lock, Globe, Link2, CheckSquare, Square, Sparkles, BookOpen,
  LayoutList, CalendarRange, Map as MapIcon, ArrowRight,
} from "lucide-react";
import { CalendarView } from "./entries-calendar";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-800",
  平静: "bg-blue-100 text-blue-800",
  感动: "bg-pink-100 text-pink-800",
  疲惫: "bg-gray-100 text-gray-700",
  兴奋: "bg-orange-100 text-orange-800",
  思念: "bg-purple-100 text-purple-800",
};

export default function Entries() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"list" | "calendar">("list");
  const queryClient = useQueryClient();

  const deferredSearch = useDeferredValue(search);
  const deferredDestination = useDeferredValue(destination);

  const params = {
    search: deferredSearch || undefined,
    tag: selectedTag,
    destination: deferredDestination || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: entries, isLoading } = useListEntries(params);
  const { data: tags } = useListTags();
  const deleteEntry = useDeleteEntry();

  const handleDelete = (id: number) => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
    });
  };

  const hasFilters = search || selectedTag || destination || dateFrom || dateTo;

  const noteEntries      = entries?.filter((e: any) => !e.entryType || e.entryType === "note");
  const narrativeEntries = entries?.filter((e: any) => e.entryType === "narrative");
  const displayEntries   = selectMode ? noteEntries : narrativeEntries;

  const travelDays = (entry: any) => {
    if (!entry.endDate) return 1;
    return Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const goCompose = () => {
    if (selected.size < 2) return;
    navigate(`/entries/compose?ids=${[...selected].join(",")}`);
  };

  const clearSearch = () => { setSearch(""); setDestination(""); setDateFrom(""); setDateTo(""); };

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-black text-foreground tracking-tight">旅记册</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "加载中…" : (
                <>{narrativeEntries?.length ?? 0} 篇游记 · {noteEntries?.length ?? 0} 篇随记</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                searchOpen || hasFilters ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              <Search className="w-4 h-4" />
            </button>
            {/* View toggle */}
            <div className="flex items-center rounded-xl bg-muted/60 border border-border/40 p-0.5 gap-0.5">
              <button
                onClick={() => setView("list")}
                className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn("p-2 rounded-lg transition-all", view === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <CalendarRange className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Compose / AI merge */}
            {selectMode ? (
              <>
                <button onClick={exitSelect} className="px-3 py-1.5 rounded-xl border border-border/60 bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  取消
                </button>
                <button
                  onClick={goCompose}
                  disabled={selected.size < 2}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    selected.size >= 2
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  合成 ({selected.size})
                </button>
              </>
            ) : (
              <Link href="/entries/new">
                <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                  新建旅记
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Collapsible Search / Filter Panel ── */}
        {searchOpen && (
          <div className="bg-card/70 border border-border/50 rounded-2xl p-4 shadow-sm backdrop-blur-sm space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="搜索标题、内容或目的地…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="relative group">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="目的地筛选…"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm"
                />
                {destination && (
                  <button onClick={() => setDestination("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm w-full" />
              </div>
              <span className="text-muted-foreground text-sm shrink-0">至</span>
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="pl-9 bg-background border-border/60 rounded-xl h-10 text-sm w-full" />
              </div>
              {hasFilters && (
                <button onClick={clearSearch} className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50">
                  清除
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── AI 合成游记 Banner ── */}
        {!selectMode ? (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">AI 合成游记</p>
              <p className="text-xs text-muted-foreground mt-0.5">选 2 篇以上随记，自动生成完整旅行故事</p>
            </div>
            <button
              onClick={() => setSelectMode(true)}
              className="shrink-0 text-xs font-bold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              去合成 →
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm text-primary flex items-center gap-3">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>正在显示随记 —— 选 <strong>2 篇或以上</strong>，AI 合成完整游记</span>
          </div>
        )}

        {/* ── Tag Pills ── */}
        {tags && tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => setSelectedTag(undefined)}
              className={cn("shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
                !selectedTag ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground")}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.name ? undefined : tag.name)}
                className={cn("shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
                  selectedTag === tag.name ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground")}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Calendar View ── */}
        {view === "calendar" && !isLoading && (
          <CalendarView entries={entries ?? []} />
        )}

        {/* ── Entries List ── */}
        {view === "list" && isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[320px] rounded-[1.5rem] bg-muted/60" />)}
          </div>
        ) : view === "list" && displayEntries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card/30 border border-border/40 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 rotate-3">
              {selectMode
                ? <Sparkles className="w-8 h-8 text-primary/70" />
                : <BookOpen className="w-8 h-8 text-primary/70" />}
            </div>
            <h3 className="text-xl font-serif font-bold mb-2 text-foreground">
              {selectMode ? "还没有随记" : hasFilters ? "没有找到匹配的日记" : "还没有合成游记"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
              {selectMode
                ? "在旅途中随手记录几个瞬间，再用 AI 合成为完整游记。"
                : hasFilters ? "试试调整搜索条件或清除筛选。"
                : "选几篇零散的随记，让 AI 帮你编织成一篇完整的旅行故事。"}
            </p>
            {!selectMode && !hasFilters && (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                去合成游记
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {displayEntries?.map((entry: any) => {
              const isSelected = selected.has(entry.id);
              return (
                <div
                  key={entry.id}
                  onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                  className={cn(
                    "group relative bg-card rounded-[1.5rem] overflow-hidden border shadow-sm transition-all duration-300 flex flex-col",
                    selectMode
                      ? isSelected
                        ? "border-primary ring-2 ring-primary/30 cursor-pointer shadow-md"
                        : "border-border/40 cursor-pointer hover:border-primary/40"
                      : "border-border/40 hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5",
                  )}
                >
                  {/* Selection checkbox */}
                  {selectMode && (
                    <div className="absolute top-4 left-4 z-20">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-background/90 text-muted-foreground border border-border/50")}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  {!selectMode ? (
                    <Link href={`/entries/${entry.id}`} className="flex flex-col flex-1">
                      <EntryCardInner entry={entry} travelDays={travelDays} />
                    </Link>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <EntryCardInner entry={entry} travelDays={travelDays} />
                    </div>
                  )}

                  {/* Kebab menu */}
                  {!selectMode && (
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 text-sm rounded-xl">
                            <DropdownMenuItem asChild>
                              <Link href={`/entries/${entry.id}/edit`} className="cursor-pointer py-2">编辑</Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer py-2">删除</DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-serif">删除日记</AlertDialogTitle>
                            <AlertDialogDescription>确定要删除「{entry.title}」吗？此操作无法撤销，相关照片也会一并删除。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function EntryCardInner({ entry, travelDays }: { entry: any; travelDays: (e: any) => number }) {
  const plain = entry.content ? entry.content.replace(/<[^>]*>?/gm, "") : "";

  return (
    <>
      {/* ── Cover image ── */}
      <div className="relative h-44 md:h-48 overflow-hidden bg-muted/30 shrink-0">
        {entry.coverImage ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <MapIcon className="w-12 h-12 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Visibility badge — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1">
          {entry.visibility === "public"
            ? <Globe className="w-3 h-3 text-white" />
            : entry.visibility === "shared"
            ? <Link2 className="w-3 h-3 text-white" />
            : <Lock className="w-3 h-3 text-white/80" />}
          <MapPin className="w-3 h-3 text-white/80" />
          <span className="text-[11px] text-white/80 font-semibold leading-none">{entry.destination || "未知地点"}</span>
        </div>

        {/* Mood badge — top right */}
        {entry.mood && (
          <div className="absolute top-3 right-3">
            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm", MOODS[entry.mood] ?? "bg-muted text-muted-foreground")}>
              {entry.mood}
            </span>
          </div>
        )}

        {/* Title overlay — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif font-bold text-[17px] leading-snug text-white drop-shadow-md line-clamp-2">
            {entry.title}
          </h3>
        </div>
      </div>

      {/* ── Body (desktop only content snippet) ── */}
      {plain && (
        <div className="hidden md:block px-4 pt-3 pb-0">
          <p className="text-[13px] text-muted-foreground/80 line-clamp-2 leading-relaxed italic">
            "{plain.slice(0, 80)}{plain.length > 80 ? "…" : ""}"
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/40 mt-auto bg-[#fcfbf9] dark:bg-card">
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-primary/60" />
            {format(new Date(entry.startDate), "yyyy.MM.dd")}
          </span>
          {entry.photoCount > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
              {entry.photoCount} 帧
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3 text-muted-foreground/40" />
            {travelDays(entry)} 天
          </span>
        </div>
        <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 whitespace-nowrap">
          阅读 <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </>
  );
}
