"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";

import Upload from "@/components/Upload";
import TasksTable from "@/components/TasksTable";
import CalendarPreview from "@/components/CalendarPreview";
import FilterBar from "@/components/FilterBar";
import MiniMonth from "@/components/MiniMonth";

import type { SyllabusItem, TaskType } from "@/lib/types";
import { extractFromPlainText } from "@/lib/parser";

type Filters = {
  q: string;
  type: TaskType | "All";
  from?: string; // yyyy-LL-dd
  to?: string;   // yyyy-LL-dd
};

export default function Page() {
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [filters, setFilters] = useState<Filters>({ q: "", type: "All" });

  // month anchor for mini calendar (defaults to now or first item)
  const initialAnchor = useMemo(() => {
    const first = items[0]?.startISO;
    return first ? first : DateTime.now().toISO()!;
  }, [items]);
  const [monthAnchorISO, setMonthAnchorISO] = useState(initialAnchor);

  // ----- File handler -----
  async function handleFile(file: File) {
    const name = (file.name || "").toLowerCase();
    const isTxt = name.endsWith(".txt");

    if (isTxt) {
      const text = await file.text();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
      const parsed = extractFromPlainText(text, tz);
      if (!parsed.length) {
        alert("No dates found in the text. Try adding a date like 'Sept 24'.");
        return;
      }
      setItems(parsed);
      setMonthAnchorISO(parsed[0].startISO);
      return;
    }

    // base64 route for PDF/DOCX
    try {
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
      const res = await fetch("/api/parse-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mime: file.type, base64 }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Failed to parse (${res.status}). ${msg || "Try a .txt file for now."}`);
        return;
      }
      const data = await res.json();
      if (!data.items?.length) {
        alert("No dates found.");
        return;
      }
      setItems(data.items);
      setMonthAnchorISO(data.items[0].startISO);
    } catch (err: any) {
      alert(`Unexpected error: ${err?.message || err}`);
    }
  }

  async function exportIcs() {
    const res = await fetch("/api/ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: filtered }), // export filtered view
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to generate .ics (${res.status}). ${msg}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "syllabus-calendar.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  // ----- Filtering logic -----
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const t = filters.type;

    let list = [...items];

    if (q) {
      list = list.filter((it) =>
        (it.title?.toLowerCase().includes(q)) ||
        (it.details?.toLowerCase().includes(q))
      );
    }

    if (t !== "All") list = list.filter((it) => it.type === t);

    if (filters.from) {
      const from = DateTime.fromISO(filters.from).startOf("day");
      list = list.filter((it) => DateTime.fromISO(it.startISO) >= from);
    }
    if (filters.to) {
      const to = DateTime.fromISO(filters.to).endOf("day");
      list = list.filter((it) => DateTime.fromISO(it.startISO) <= to);
    }

    list.sort((a, b) => a.startISO.localeCompare(b.startISO));
    return list;
  }, [items, filters]);

  const clearFilters = () => setFilters({ q: "", type: "All" });

  const hasEventOnDay = (dt: DateTime) =>
    items.some((it) => DateTime.fromISO(it.startISO).hasSame(dt, "day"));

  const pickDay = (isoDate: string) => {
    setFilters({ ...filters, from: isoDate, to: isoDate });
  };

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <div className="card">
        <h2 className="mb-3">Syllabus → Calendar</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.docx,.txt";
            input.onchange = () => { const f = (input.files?.[0]); if (f) handleFile(f); };
            input.click();
          }}
        >
          Choose File
        </button>
      </div>

      {/* Filters + Mini calendar */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <FilterBar filters={filters} setFilters={setFilters} onClear={clearFilters} />
        </div>
        <MiniMonth
          monthAnchorISO={monthAnchorISO}
          setMonthAnchorISO={setMonthAnchorISO}
          hasEventOnDay={hasEventOnDay}
          onPickDay={pickDay}
        />
      </div>

      {/* Table + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="card w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2>Review & Edit</h2>
            <button className="btn btn-primary" onClick={exportIcs}>Export .ics</button>
          </div>
          <div className="min-w-0">
            <TasksTable items={filtered} setItems={setItems} />
          </div>
        </div>

        <div className="card w-full min-w-0 overflow-hidden">
          <h2 className="mb-3">Calendar Preview (List)</h2>
          <div className="min-w-0">
            <CalendarPreview items={filtered} />
          </div>
        </div>
      </div>
    </div>
  );
}
