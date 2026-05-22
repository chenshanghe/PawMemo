import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useListEntries, useListTags, useDeleteEntry, getListEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarDays, Image as ImageIcon, Search, Plus, Trash2, Star, X, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_TAGS = ["全部", "城市", "美食", "古镇", "自然", "文化"];

const MOODS: Record<string, string> = {
  开心: "bg-yellow-100 text-yellow-800",
  平静: "bg-blue-100 text-blue-800",
  感动: "bg-pink-100 text-pink-800",
  疲惫: "bg-gray-100 text-gray-700",
  兴奋: "bg-orange-100 text-orange-800",
  思念: "bg-purple-100 text-purple-800",
};

export default function Entries() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const queryClient = useQueryClient();

  const params = {
    search: search || undefined,
    tag: selectedTag,
    destination: destination || undefined,
  };

  const { data: entries, isLoading } = useListEntries(params);
  const { data: tags } = useListTags();
  const deleteEntry = useDeleteEntry();

  const handleDelete = (id: number) => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
    });
  };

  const hasFilters = search || selectedTag || destination;

  const travelDays = (entry: any) => {
    if (!entry.endDate) return 1;
    return Math.max(1, Math.ceil((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000) + 1);
  };

  return (
    <Layout>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">所有日记</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "加载中..." : `共 ${entries?.length ?? 0} 篇旅行记忆`}
            </p>
          </div>
          <Link href="/entries/new">
            <Button size="sm" className="gap-1.5 shadow-sm rounded-xl font-semibold">
              <Plus className="w-4 h-4" />
              写日记
            </Button>
          </Link>
        </div>

        {/* ── Search ── */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索日记标题、内容或目的地..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 rounded-xl h-10 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="目的地筛选..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-9 bg-card border-border/50 rounded-xl h-10 text-sm"
            />
            {destination && (
              <button
                onClick={() => setDestination("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Category Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {CATEGORY_TAGS.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                if (cat !== "全部") setSelectedTag(cat === selectedTag ? undefined : cat);
                else setSelectedTag(undefined);
              }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
          {/* User-defined tags */}
          {tags?.filter((t) => !CATEGORY_TAGS.includes(t.name)).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.name ? undefined : tag.name)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedTag === tag.name
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>

        {/* ── Entries List ── */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : entries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/40">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-primary/60" />
            </div>
            <h3 className="text-lg font-serif font-bold mb-1.5 text-foreground">
              {hasFilters ? "没有找到匹配的日记" : "还没有任何日记"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {hasFilters ? "试试调整搜索条件" : "每一段旅程都值得被记录"}
            </p>
            {!hasFilters && (
              <Link href="/entries/new">
                <Button className="rounded-xl shadow-sm">写下第一篇日记</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {entries?.map((entry) => (
              <div key={entry.id} className="group relative bg-card rounded-2xl overflow-hidden border border-border/40 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-300">
                {/* Cover image */}
                <Link href={`/entries/${entry.id}`} className="block">
                  <div className="relative aspect-[16/7] overflow-hidden bg-muted/40">
                    {entry.coverImage ? (
                      <img
                        src={entry.coverImage}
                        alt={entry.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/25" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {/* Location */}
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                      <MapPin className="w-3 h-3 text-primary" />
                      {entry.destination}
                    </div>
                    {/* Date range */}
                    <div className="absolute top-3 right-10 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-muted-foreground shadow-sm">
                      {format(new Date(entry.startDate), 'MM.dd')}
                      {entry.endDate && ` — ${format(new Date(entry.endDate), 'MM.dd')}`}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
                        {entry.title}
                      </h3>
                    </div>

                    {(entry as any).content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-2 leading-relaxed">
                        "{(entry as any).content.slice(0, 70)}{(entry as any).content.length > 70 ? '…"' : '"'}"
                      </p>
                    )}

                    {entry.rating && (
                      <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: entry.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {travelDays(entry)} 天旅程
                        </span>
                        {(entry as any).photoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            {(entry as any).photoCount} 张照片
                          </span>
                        )}
                        {entry.mood && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>
                            {entry.mood}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Menu (absolute, outside link) */}
                <div className="absolute top-3 right-3 z-10">
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full bg-background/90 shadow-sm text-muted-foreground hover:text-foreground transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/entries/${entry.id}/edit`} className="cursor-pointer">编辑</Link>
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                            删除
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除日记</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除「{entry.title}」吗？此操作无法撤销，相关照片也会一并删除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
