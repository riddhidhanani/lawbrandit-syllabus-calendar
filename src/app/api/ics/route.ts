import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { DateTime } from "luxon";
import { createEvents } from "ics";
import type { SyllabusItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { items } = await req.json() as { items: SyllabusItem[] };
  const events = items.map((it) => {
    const start = DateTime.fromISO(it.startISO);
    const end = DateTime.fromISO(it.endISO);
    return {
      title: `${it.title}${it.type ? " [" + it.type + "]" : ""}`,
      description: it.details ?? "",
      start: [start.year, start.month, start.day, start.hour, start.minute],
      end: [end.year, end.month, end.day, end.hour, end.minute]
    }
  });

  const { error, value } = createEvents(events as any);
  if (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="syllabus-calendar.ics"'
    }
  });
}
