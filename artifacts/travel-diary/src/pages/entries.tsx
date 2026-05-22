import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useListEntries, useListTags, useDeleteEntry, getListEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarDays, Image as ImageIcon, Search, Plus, Trash2, Star, Filter, X } from "lucide-react";
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
      },
    });
  };

  const hasFilters = search || selectedTag || destination;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-foreground">所有日记</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading ? "加载中..." : `共 ${entries?.length ?? 0} 篇旅行记忆`}
            </p>
          </div>
          <Link href="/entries/new">
            <Button className="shadow-sm gap-2">
              <Plus className="w-4 h-4" />
              写新日记
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索日记标题、内容或目的地..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/60"
            />
          </div>
          <div className="relative sm:w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="目的地筛选..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-9 bg-card border-border/60"
            />
          </div>
          {hasFilters && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setSearch(""); setSelectedTag(undefined); setDestination(""); }}
              title="清除筛选"
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tag filter pills */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.name ? undefined : tag.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  selectedTag === tag.name
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Entries Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : entries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/30">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">
              {hasFilters ? "没有找到匹配的日记" : "还没有任何日记"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {hasFilters ? "试试调整搜索条件" : "每一段旅程都值得被记录。开始你的第一篇旅行日记吧。"}
            </p>
            {!hasFilters && (
              <Link href="/entries/new">
                <Button>写下第一篇日记</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {entries?.map((entry, i) => (
              <div
                key={entry.id}
                className="group relative"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Link href={`/entries/${entry.id}`}>
                  <Card className="h-full overflow-hidden border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-lg bg-card/90 backdrop-blur-sm cursor-pointer">
                    <div className="aspect-[3/2] relative overflow-hidden bg-muted/30">
                      {entry.coverImage ? (
                        <img
                          src={entry.coverImage}
                          alt={entry.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm">
                        <MapPin className="w-3 h-3 text-primary" />
                        {entry.destination}
                      </div>
                      {entry.rating && (
                        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-0.5 shadow-sm">
                          {Array.from({ length: entry.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{entry.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(new Date(entry.startDate), 'yyyy年MM月dd日')}
                        </span>
                        {entry.photoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            {entry.photoCount} 张照片
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.mood && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOODS[entry.mood] ?? "bg-muted text-muted-foreground"}`}>
                            {entry.mood}
                          </span>
                        )}
                        {entry.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-xs border-border/50 bg-transparent text-muted-foreground">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-background/90 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-sm z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>删除日记</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除「{entry.title}」吗？此操作无法撤销，相关照片也会一并删除。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
