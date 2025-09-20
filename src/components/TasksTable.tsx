"use client";

import { DateTime } from "luxon";
import type { SyllabusItem, TaskType } from "@/lib/types";

const TYPES: TaskType[] = ["Reading", "Assignment", "Exam", "Other"];

/**
 * Grid columns (desktop):
 *  - Date/Time: 200px
 *  - Title:     min 260px, grows
 *  - Type:      160px fixed
 *  - Details:   min 300px, grows a bit more
 *  - Delete:    64px
 *
 * These minimums stop the Title/Details from collapsing to a tiny sliver.
 * On narrow screens, the whole editor becomes horizontally scrollable
 * rather than overlapping the Preview.
 */
export default function TasksTable({
  items,
  setItems,
}: {
  items: SyllabusItem[];
  setItems: (items: SyllabusItem[]) => void;
}) {
  function update(i: number, patch: Partial<SyllabusItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
  }
  function remove(i: number) {
    const next = [...items];
    next.splice(i, 1);
    setItems(next);
  }

  // Shared grid template for header and rows
  const cols =
    "grid grid-cols-[200px_minmax(260px,1fr)_160px_minmax(300px,1.2fr)_64px] gap-4 items-center";

  return (
    // allow horizontal scroll as last resort (prevents overlap)
    <div className="overflow-x-auto">
      {/* Header */}
      <div className={`${cols} text-sm text-white/85 px-1 min-w-[1000px]`}>
        <div>Date/Time</div>
        <div>Title</div>
        <div>Type</div>
        <div>Details</div>
        <div />
      </div>

      {/* Rows */}
      <div className="space-y-3 min-w-[1000px]">
        {items.map((it, i) => (
          <div key={it.id} className={`rowcard ${cols} min-w-0`}>
            {/* Date/Time */}
            <input
              className="input w-full min-w-0"
              value={DateTime.fromISO(it.startISO).toFormat("yyyy-LL-dd HH:mm")}
              onChange={(e) => {
                const dt = DateTime.fromFormat(e.target.value, "yyyy-LL-dd HH:mm", {
                  zone: "local",
                });
                if (dt.isValid) {
                  update(i, {
                    startISO: dt.toISO()!,
                    endISO: dt.plus({ minutes: 60 }).toISO()!,
                  });
                }
              }}
              title="Format: yyyy-mm-dd HH:mm"
            />

            {/* Title (wide, real minimum) */}
            <input
              className="input w-full min-w-0"
              value={it.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Title"
            />

            {/* Type (fixed, no clipping) */}
            <div className="w-full min-w-0 overflow-visible">
              <select
                className="select w-full"
                value={it.type}
                onChange={(e) => update(i, { type: e.target.value as TaskType })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Details (wide, multi-line) */}
            <textarea
              className="textarea w-full min-w-0"
              value={it.details ?? ""}
              onChange={(e) => update(i, { details: e.target.value })}
              rows={2}
              placeholder="Details (Location, pages, submission, notes…)"
            />

            {/* Delete */}
            <button
              className="text-red-300 hover:text-red-200 hover:underline"
              onClick={() => remove(i)}
            >
              Delete
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center text-white/80 py-6">
            No items yet — upload a syllabus to start.
          </div>
        )}
      </div>
    </div>
  );
}
