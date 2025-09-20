import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syllabus → Calendar | LawBandit",
  description: "Turn your syllabus into calendar events in 60 seconds."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white text-[color:var(--brand)] grid place-items-center font-extrabold">LB</div>
              <div>
                <div className="font-semibold tracking-tight text-white">Syllabus → Calendar</div>
                <div className="text-sm text-white/70">Upload. Review. Export to your calendar.</div>
              </div>
            </div>
            <a className="text-sm text-white/70 hover:underline" href="https://lawbandit.com" target="_blank">LawBandit</a>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="card">
            <h1>Syllabus → Calendar</h1>
            <p className="text-[15px] text-white/80 mt-1">
              Drop in a syllabus and get calendar-ready tasks with clear titles, dates, and details.
            </p>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
