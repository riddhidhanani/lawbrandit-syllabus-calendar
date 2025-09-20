import { DateTime } from "luxon";
import * as chrono from "chrono-node";
import type { SyllabusItem, TaskType } from "./types";
import * as cheerio from "cheerio";

/* ---------- Type detection ---------- */
const KEYWORDS: Record<TaskType, RegExp> = {
  Exam: /\b(final|midterm|exam|quiz|test)\b/i,
  Assignment: /\b(assign(ment)?|project|paper|report|submission|submit|due)\b/i,
  Reading: /\b(reading|chapter|chap\.|ch\.|pp\.\s*\d)/i,
  Other: /.^/,
};

export function inferType(s: string): TaskType {
  for (const t of ["Exam", "Assignment", "Reading"] as TaskType[]) {
    if (KEYWORDS[t].test(s)) return t;
  }
  return "Other";
}

/* ---------- Utilities ---------- */
function clean(s: string | undefined): string {
  return (s || "")
    .replace(/\u2013|\u2014|–|—/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .trim();
}

function fmtISO(date: DateTime, minutes = 60) {
  const start = date;
  const end = date.plus({ minutes });
  return { startISO: start.toISO()!, endISO: end.toISO()! };
}

function ensureYear(d: DateTime, tz: string) {
  return d.set({ year: d.year || DateTime.now().setZone(tz).year });
}

/* ---------- Text-based extraction (PDF/TXT) ---------- */
export function extractFromPlainText(text: string, tz: string): SyllabusItem[] {
  const items: SyllabusItem[] = [];
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);

  for (const line of lines) {
    const parsed = chrono.parse(line, { timezone: tz });
    if (!parsed.length) continue;

    // If a line has multiple date hits, make an event for each
for (const r of parsed) {
  if (!r.start) continue;

  // Build from a real JS Date to avoid null/undefined typing issues
  let date = DateTime.fromJSDate(r.start.date(), { zone: tz });

  // If no time specified, default to noon
  if (!r.start.isCertain?.("hour")) {
    date = date.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  }

  // If year is missing, use current year in the user's TZ
  if (!r.start.isCertain?.("year")) {
    date = date.set({ year: DateTime.now().setZone(tz).year });
  }

  const titleRaw = clean(line.replace(r.text, ""));
  const title = titleRaw || "Course Task";
  const type = inferType(line);

  const { startISO, endISO } = fmtISO(date);
  items.push({
    id: crypto.randomUUID(),
    title,
    type,
    details: line,
    startISO,
    endISO,
  });
}
  }

  // de-dupe by start+title
  const map = new Map<string, SyllabusItem>();
  for (const it of items) {
    const key = `${it.title}|${it.startISO}`;
    if (!map.has(key)) map.set(key, it);
  }
  return Array.from(map.values());
}

/* ---------- DOCX HTML extraction (tables, robust for multi-row headers) ---------- */
export function extractFromDocxHTML(html: string, tz: string): SyllabusItem[] {
  const $ = cheerio.load(html);
  const out: SyllabusItem[] = [];

  const dateRegex =
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/i;

  $("table").each((_, table) => {
    // Build matrix of rows -> cells (plain text)
    const rows: string[][] = [];
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr)
          .find("th,td")
          .toArray()
          .map((td) => clean($(td).text()));
        // Skip fully empty rows
        if (cells.join("").trim().length === 0) return;
        rows.push(cells);
      });

    if (rows.length === 0) return;

    // --- 1) Find header block (can be 1–2 rows). We’ll pick the last header-ish row. ---
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const joined = rows[i].join(" ").toLowerCase();
      const looksHeader =
        /class\s*date|date|activities|lecture|submission|quiz|location/.test(joined);
      if (looksHeader) headerIdx = i;
    }

    const header = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);

    // --- 2) Infer column roles. If header doesn’t help, use content heuristics. ---
    const N = Math.max(...rows.map((r) => r.length));
    const labels = new Array(N).fill("other") as string[];

    function labelFromHeader(txt: string) {
      const s = txt.toLowerCase();
      if (/class\s*date|^date$/.test(s)) return "date";
      if (/activities|lecture|topic/.test(s)) return "activity";
      if (/submission|quiz|assignment|deliverable|due/.test(s)) return "submission";
      if (/location|room/.test(s)) return "location";
      return "other";
    }

    for (let i = 0; i < header.length; i++) {
      labels[i] = labelFromHeader(header[i]);
    }

    // If we still don't know the date column, pick the one with most date-like cells
    if (!labels.includes("date")) {
      let bestIdx = -1;
      let bestScore = -1;
      for (let c = 0; c < N; c++) {
        let score = 0;
        for (const r of dataRows) {
          const v = r[c] || "";
          if (dateRegex.test(v)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = c;
        }
      }
      if (bestIdx >= 0) labels[bestIdx] = "date";
    }

    // --- 3) Parse each data row into events ---
    for (const r of dataRows) {
      // Pull columns by inferred role
      const get = (role: string) => {
        const idx = labels.indexOf(role);
        return idx >= 0 ? (r[idx] || "") : "";
      };

      const dateStr = get("date");
      if (!dateStr || !dateRegex.test(dateStr)) continue;

      const hit = chrono.parse(dateStr, { timezone: tz })[0];
      if (!hit || !hit.start) continue;
      let date = DateTime.fromJSDate(hit.start.date(), { zone: tz }).set({
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      });

      const location = get("location");
      const activity = get("activity");
      const submission = get("submission");

      const pushRowEvent = (source: string, kindHint?: TaskType) => {
        const title = smartTitle(source);
        const type = kindHint ?? inferType(source);
        const details = [
          location ? `Location: ${location}` : "",
          // If both exist, include the "other" column in details to give context.
          source !== activity && activity ? `Activity: ${activity}` : "",
          source !== submission && submission ? `Submission: ${submission}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const { startISO, endISO } = fmtISO(date);
        out.push({
          id: crypto.randomUUID(),
          title,
          type,
          details: details || undefined,
          startISO,
          endISO,
        });
      };

      // Create events. Many syllabi put “Quiz/Assignment” in submission column,
      // and topic/lecture in activity column.
      if (submission && /[a-z0-9]/i.test(submission)) {
        // Prefer Assignment/Exam classification for submissions
        const hint: TaskType = /quiz|exam|midterm|final/i.test(submission)
          ? "Exam"
          : "Assignment";
        pushRowEvent(submission, hint);
      }

      if (activity && /[a-z0-9]/i.test(activity)) {
        pushRowEvent(activity);
      }

      // If both columns empty but there is a date, create a generic session
      if (!activity && !submission) {
        const { startISO, endISO } = fmtISO(date);
        out.push({
          id: crypto.randomUUID(),
          title: "Class Session",
          type: "Other",
          details: location ? `Location: ${location}` : undefined,
          startISO,
          endISO,
        });
      }
    }
  });

  // Fallback: if nothing parsed, use plain text from HTML body
  if (out.length === 0) {
    const text = cheerio.load(html)("body").text();
    return extractFromPlainText(text, tz);
  }

  // De-duplicate and sort
  const dedup = new Map<string, SyllabusItem>();
  for (const e of out) {
    const key = `${e.title}|${e.startISO}`;
    if (!dedup.has(key)) dedup.set(key, e);
  }
  return Array.from(dedup.values()).sort((a, b) => a.startISO.localeCompare(b.startISO));
}


/* ---------- Smart title generator ---------- */
function smartTitle(s: string): string {
  const raw = clean(s);

  // Common patterns → cleaner titles
  if (/^quiz\s*\d+/i.test(raw)) return raw.replace(/\s+/g, " ").replace(/\bpp\..*$/i, "").trim();
  if (/^assignment\s*\d+/i.test(raw)) return raw.replace(/\s+/g, " ").trim();
  if (/^group presentation/i.test(raw)) return raw;
  if (/^midterm/i.test(raw) || /^final/i.test(raw)) return raw;

  // If it contains “reading … pp. …”, move pages to details (kept in row details)
  if (/reading/i.test(raw)) {
    return raw.replace(/\s*[-–—]?\s*pp\..*$/i, "").trim() || "Reading";
  }

  // Fallback
  return raw || "Course Task";
}
