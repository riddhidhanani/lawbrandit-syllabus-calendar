"use client";

import { useCallback } from "react";

export default function Upload({ onFile }: { onFile: (file: File) => void }) {
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center"
    >
      <p className="text-sm text-white/70">Drag & drop a PDF/DOCX/TXT here</p>
      <p className="text-xs text-white/50 mt-1">or click to choose</p>
      <label className="inline-block mt-4 btn cursor-pointer">
        Choose File
        <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}
