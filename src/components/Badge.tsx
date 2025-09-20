export default function Badge({
  type,
}: {
  type: "Reading" | "Assignment" | "Exam" | "Other";
}) {
  const map = {
    Reading:   { cls: "badge badge-reading",  icon: "📘" },
    Assignment:{ cls: "badge badge-assign",   icon: "📝" },
    Exam:      { cls: "badge badge-exam",     icon: "🧪" },
    Other:     { cls: "badge badge-other",    icon: "📌" },
  } as const;

  const s = map[type] || map.Other;
  return <span className={s.cls}>{s.icon} {type}</span>;
}
