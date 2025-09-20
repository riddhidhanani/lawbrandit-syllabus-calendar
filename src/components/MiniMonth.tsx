"use client";

import { DateTime } from "luxon";

/**
 * Mini month calendar with **Sunday-first** grid.
 * - Weeks always render Sun..Sat (headers and grid match).
 * - We generate 42 cells (6 rows) starting from the Sunday
 *   on/before the first of the month.
 */
export default function MiniMonth({
  monthAnchorISO,
  setMonthAnchorISO,
  hasEventOnDay,   // (dtLocal: DateTime) => boolean
  onPickDay,       // (isoDate: string) => void  e.g., "2025-09-18"
}: {
  monthAnchorISO: string;
  setMonthAnchorISO: (iso: string) => void;
  hasEventOnDay: (dt: DateTime) => boolean;
  onPickDay: (isoDate: string) => void;
}) {
  // Use local zone for UI; your items are compared by date (no time)
  const anchor = DateTime.fromISO(monthAnchorISO).setZone("local");

  // Sunday-first math:
  // Luxon weekday: Mon=1 … Sun=7
  const firstOfMonth = anchor.startOf("month");
  const backDays = firstOfMonth.weekday % 7; // 0 if Sunday, 1 if Monday, …, 6 if Saturday
  const gridStart = firstOfMonth.minus({ days: backDays });

  // Build exactly 42 days
  const days: DateTime[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(gridStart.plus({ days: i }));
  }

  const goto = (deltaMonths: number) =>
    setMonthAnchorISO(anchor.plus({ months: deltaMonths }).toISO()!);

  const monthLabel = anchor.toFormat("LLLL yyyy");

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <button className="btn" onClick={() => goto(-1)}>‹</button>
        <div className="font-semibold">{monthLabel}</div>
        <button className="btn" onClick={() => goto(1)}>›</button>
      </div>

      <div className="grid grid-cols-7 text-xs text-white/80 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isOtherMonth = d.month !== anchor.month;
          const hasEvt = hasEventOnDay(d);    // you already compare by day in local time
          return (
            <button
              key={d.toISODate()}
              className={`rounded-lg py-2 text-sm border border-white/20 hover:bg-white/10 transition
                ${isOtherMonth ? "text-white/50" : "text-white"}
                ${hasEvt ? "bg-white/15" : "bg-transparent"}`}
              onClick={() => onPickDay(d.toISODate()!)}
              title={d.toLocaleString(DateTime.DATE_FULL)}
            >
              <div className="leading-none">{d.day}</div>
              {hasEvt && <div className="mt-1 h-1 w-1 mx-auto rounded-full bg-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
