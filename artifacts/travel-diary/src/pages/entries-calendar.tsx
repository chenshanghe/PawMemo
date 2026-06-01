import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isToday,
} from "date-fns";

const ENTRY_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#f59e0b", "#14b8a6", "#ef4444",
  "#84cc16", "#6366f1",
];

const DAY_HEADERS = ["日", "一", "二", "三", "四", "五", "六"];

interface EntryItem {
  id: number;
  title: string;
  destination: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  mood?: string | null;
  entryType?: string;
}

interface CalendarViewProps {
  entries: EntryItem[];
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

export function CalendarView({ entries }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const noteEntries = entries.filter((e) => !e.entryType || e.entryType === "note");

  const sortedEntries = useMemo(
    () => [...noteEntries].sort((a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime()),
    [noteEntries.map((e) => e.id).join()],
  );

  const colorOf = (id: number) =>
    ENTRY_COLORS[sortedEntries.findIndex((e) => e.id === id) % ENTRY_COLORS.length] ?? ENTRY_COLORS[0];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const allDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const coveringEntries = (day: Date) =>
    sortedEntries.filter((e) => {
      const s = toDate(e.startDate);
      const en = e.endDate ? toDate(e.endDate) : s;
      s.setHours(0, 0, 0, 0);
      en.setHours(23, 59, 59, 999);
      return day >= s && day <= en;
    });

  const monthEntries = useMemo(
    () =>
      sortedEntries.filter((e) => {
        const s = toDate(e.startDate);
        const en = e.endDate ? toDate(e.endDate) : s;
        return s <= monthEnd && en >= monthStart;
      }),
    [sortedEntries, currentMonth],
  );

  const selectedEntries = selectedDay ? coveringEntries(selectedDay) : [];

  const prevMonth = () => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null); };

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="font-serif font-bold text-lg text-foreground">{format(currentMonth, "yyyy年 MM月")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{monthEntries.length} 段旅程</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-border/30">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {allDays.map((day, i) => {
            const inMonth = day.getMonth() === currentMonth.getMonth();
            const isSelected = selectedDay != null && isSameDay(day, selectedDay);
            const isTodayDay = isToday(day);
            const hits = inMonth ? coveringEntries(day) : [];
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <button
                key={i}
                onClick={() => inMonth && setSelectedDay(isSelected ? null : new Date(day))}
                disabled={!inMonth}
                className={[
                  "relative min-h-[56px] p-1.5 flex flex-col items-center gap-0.5",
                  "border-b border-r border-border/20",
                  "transition-colors duration-150",
                  inMonth ? "hover:bg-muted/30 cursor-pointer" : "opacity-25 cursor-default",
                  isSelected ? "bg-primary/8 ring-inset ring-2 ring-primary/25" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isTodayDay ? "bg-primary text-primary-foreground font-bold" : "",
                    isSelected && !isTodayDay ? "text-primary font-semibold" : "",
                    !inMonth ? "text-muted-foreground" : isWeekend && !isTodayDay ? "text-muted-foreground" : "text-foreground",
                  ].join(" ")}
                >
                  {day.getDate()}
                </span>

                {hits.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                    {hits.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: colorOf(e.id) }}
                      />
                    ))}
                    {hits.length > 3 && (
                      <span className="text-[8px] text-muted-foreground leading-[6px]">+{hits.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color legend */}
      {monthEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {monthEntries.slice(0, 8).map((e) => (
            <div key={e.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(e.id) }} />
              <span className="truncate max-w-[80px]">{e.title}</span>
            </div>
          ))}
          {monthEntries.length > 8 && <span className="text-xs text-muted-foreground">+{monthEntries.length - 8} 更多</span>}
        </div>
      )}

      {/* Selected day list */}
      {selectedDay && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {format(selectedDay, "MM月dd日")} 的旅程
          </p>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">这天没有旅行记录</p>
          ) : (
            selectedEntries.map((e) => (
              <Link key={e.id} href={`/entries/${e.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorOf(e.id) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.destination}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Month entry list (when no day selected) */}
      {!selectedDay && monthEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">本月旅程</p>
          {monthEntries.map((e) => {
            const s = toDate(e.startDate);
            const en = e.endDate ? toDate(e.endDate) : s;
            const days = Math.max(1, Math.round((en.getTime() - s.getTime()) / 86400000) + 1);
            return (
              <Link key={e.id} href={`/entries/${e.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                  <div
                    className="w-2 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: colorOf(e.id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.destination} · {format(s, "MM/dd")}
                      {!isSameDay(s, en) ? ` — ${format(en, "MM/dd")}` : ""} · {days} 天
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!selectedDay && monthEntries.length === 0 && (
        <div className="flex flex-col items-center py-10 gap-3 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">本月没有旅行记录</p>
          <p className="text-xs text-muted-foreground/60">点击上方箭头切换月份</p>
        </div>
      )}
    </div>
  );
}
