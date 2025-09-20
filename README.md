# LawBandit – Syllabus → Calendar (TypeScript + Node.js on Vercel)

Turn a messy syllabus into calendar events in **60 seconds**. Upload PDF/DOCX/TXT → review → export `.ics` (works with Google/Apple/Outlook).

## Live Demo
Deploy on Vercel and paste your URL here, e.g. `https://syllabus-calendar.vercel.app`

## Tech
- **Next.js 14 (TypeScript)** – Vercel-friendly, Node.js runtime for APIs
- **PDF/DOCX parsing** – `pdf-parse`, `mammoth`
- **Date detection** – `chrono-node`
- **Calendar export** – `ics`
- **Timezone & formatting** – `luxon`
- **UI** – TailwindCSS

## Getting Started

```bash
pnpm i   # or npm/yarn
pnpm dev # http://localhost:3000
```

> Node 18+ recommended.

## How It Works
1. Upload a syllabus file (PDF/DOCX/TXT).
2. The API extracts raw text and uses `chrono-node` to detect dates/times.
3. We build structured tasks with sensible defaults (1 hour duration if no end time).
4. You review & edit in a simple table.
5. Click **Export .ics** to download a calendar file.

## Notes
- Files are parsed in-memory. No server storage by default.
- If dates have no year, we assume current year (editable in table).
- If “due 11:59pm” appears, we set start time near 11:00pm by default; you can adjust.
- Multi-day ranges are treated as separate daily events in v1 (can be extended).

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Framework: **Next.js** (no special config needed).
4. Set Node.js runtime (default on Vercel is fine).

## Roadmap / Bonus Ideas
- Google Calendar OAuth for one-click sync
- Bulk actions (shift all dates by ±n days, default times)
- Multiple syllabi merge
- Course color tags & filters
- “Confidence” column for parser output

## License
MIT
