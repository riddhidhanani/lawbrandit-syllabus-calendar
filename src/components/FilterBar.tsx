"use client";

import { DateTime } from "luxon";
import type { TaskType } from "@/lib/types";

type Filters = {
  q: string;
  type: TaskType | "All";
  from?: string; // "yyyy-LL-dd"
  to?: string;   // "yyyy-LL-dd"
};

export default function FilterBar({
  filters,
  setFilters,
  onClear,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onClear: () => void;
}) {
  return (
    <div className="card flex flex-col md:flex-row gap-3 md:items-end">
      {/* Keyword */}
      <div className="flex-1">
        <label className="block text-sm text-white/80 mb-1">Search</label>
        <input
          className="input"
          placeholder="Title or details…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
      </div>

      {/* Type */}
      <div className="w-full md:w-44">
        <label className="block text-sm text-white/80 mb-1">Type</label>
        <select
          className="select w-full"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
        >
          {["All", "Reading", "Assignment", "Exam", "Other"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* From */}
      <div>
        <label className="block text-sm text-white/80 mb-1">From</label>
        <input
          className="input"
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })}
        />
      </div>

      {/* To */}
      <div>
        <label className="block text-sm text-white/80 mb-1">To</label>
        <input
          className="input"
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
        />
      </div>

      <div className="md:ml-auto">
        <button className="btn" onClick={onClear}>Clear filters</button>
      </div>
    </div>
  );
}
