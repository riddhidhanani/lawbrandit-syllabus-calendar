import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTE: pdf-parse is intentionally not imported here.  The `pdf-parse` library
// attempts to read a test PDF file at build time which causes Vercel’s
// serverless bundler to throw an ENOENT error (see deployment logs).
// To keep the application deployable, we handle PDF uploads gracefully
// without relying on pdf-parse.  If needed, consider using an
// alternative library such as `pdfjs-dist` or implement parsing on the
// client side.
import mammoth from "mammoth";
import { extractFromPlainText, extractFromDocxHTML } from "@/lib/parser";

/** Detect file kind using MIME and filename */
function detectKind(file: Blob & { name?: string; type?: string }) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".doc")) return "doc";          // legacy .doc (unsupported)
  if (type.includes("word") || name.endsWith(".docx")) return "docx";
  if (type.includes("text") || name.endsWith(".txt")) return "txt";
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const kind = detectKind(file as any);
    const buf = Buffer.from(await (file as Blob).arrayBuffer());
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

    // Explicitly reject legacy .doc (not supported by mammoth)
    if (kind === "doc") {
      return NextResponse.json(
        { error: "Legacy .doc files aren’t supported. Please re-save as .docx or export to PDF." },
        { status: 415 }
      );
    }

    if (kind === "docx") {
      // Convert DOCX to HTML so we can parse table structure (headers like Date / Activity / Submission / Location)
      const html = (await mammoth.convertToHtml({ buffer: buf }, { includeDefaultStyleMap: true })).value || "";
      const items = extractFromDocxHTML(html, tz);
      return NextResponse.json({ items });
    }

    if (kind === "pdf") {
      // PDF parsing is currently disabled on the server to avoid build errors.
      // Return an error message to the client so the UI can handle it gracefully.
      return NextResponse.json(
        { error: "PDF parsing is not supported in this deployment. Please upload a DOCX or TXT file." },
        { status: 415 }
      );
    }

    // txt / unknown → treat as UTF-8 text
    const text = (() => {
      try {
        return new TextDecoder().decode(buf);
      } catch {
        return buf.toString("utf-8");
      }
    })();
    const items = extractFromPlainText(text, tz);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Parse error" }, { status: 500 });
  }
}
