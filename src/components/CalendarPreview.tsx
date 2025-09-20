"use client";

import { DateTime } from "luxon";
import type { SyllabusItem } from "@/lib/types";
import Badge from "./Badge";

export default function CalendarPreview({ items }: { items: SyllabusItem[] }) {
  const sorted = [...items].sort((a,b)=>a.startISO.localeCompare(b.startISO));

  // group by day
  const groups: Record<string, SyllabusItem[]> = {};
  for (const it of sorted) {
    const key = DateTime.fromISO(it.startISO).toFormat("yyyy-LL-dd");
    (groups[key] ||= []).push(it);
  }
  const days = Object.keys(groups).sort();

  return (
    <div className="timeline">
      {days.length === 0 && <div className="text-sm text-white/80">No events yet.</div>}

      {days.map((d)=> {
        const human = DateTime.fromISO(d).toLocaleString({ weekday:"long", month:"long", day:"numeric" });
        return (
          <section key={d} className="relative mb-6">
            <div className="dot" />
            {/* Date header: brighter and readable on dark */}
            <h3 className="text-sm font-semibold text-white/90 mb-3 pl-5">{human}</h3>

            <div className="space-y-3 pl-5">
              {groups[d].map((it)=> {
                const t = DateTime.fromISO(it.startISO).toLocaleString(DateTime.TIME_SIMPLE);
                return (
                  <div key={it.id} className="border border-white/25 rounded-xl p-3 bg-white/10 hover:bg-white/15 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Title: strong white */}
                        <div className="font-semibold text-white text-[16px] leading-snug break-words">
                          {it.title}
                        </div>
                        {/* Time: slightly dimmed white */}
                        <div className="text-sm text-white/80 mt-0.5">{t}</div>
                        {/* Details: high contrast but not pure white */}
                        {it.details && (
                          <div className="text-sm text-white/90 mt-1 break-words">
                            {it.details}
                          </div>
                        )}
                      </div>
                      <Badge type={it.type} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
