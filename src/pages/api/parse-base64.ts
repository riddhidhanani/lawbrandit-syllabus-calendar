// Pages API: robust on Windows; parses DOCX tables and PDF/TXT text
import type { NextApiRequest, NextApiResponse } from "next";
// NOTE: pdf-parse is intentionally not imported here.  The `pdf-parse` library
// attempts to read a test PDF file at build time which causes Vercel’s
// serverless bundler to throw an ENOENT error (see deployment logs).  To keep
// the application deployable, we handle PDF uploads gracefully without
// relying on pdf-parse.  Consider using an alternative like `pdfjs-dist` or
// implement parsing on the client side instead.
import mammoth from "mammoth";
import { extractFromPlainText, extractFromDocxHTML } from "@/lib/parser";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, mime, base64 } = req.body as { name: string; mime: string; base64: string };
    if (!base64) return res.status(400).json({ error: "Missing base64" });

    const lower = (name || "").toLowerCase();
    const buf = Buffer.from(base64, "base64");

    const isDoc  = lower.endsWith(".doc")  || mime?.includes("application/msword");
    const isDocx = lower.endsWith(".docx") || mime?.includes("wordprocessingml");
    const isPdf  = lower.endsWith(".pdf")  || mime?.includes("pdf");

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

    if (isDoc) {
      return res.status(415).json({
        error: "Legacy .doc files aren’t supported. Please re-save as .docx or export to PDF.",
      });
    }

    // DOCX: convert to HTML so we can read table structure
    if (isDocx) {
      const html = (await mammoth.convertToHtml({ buffer: buf }, { includeDefaultStyleMap: true })).value || "";
      const items = extractFromDocxHTML(html, tz);
      return res.status(200).json({ items });
    }

    // PDF: parsing disabled on server — return error so the client can handle it
    if (isPdf) {
      return res.status(415).json({ error: "PDF parsing is not supported in this deployment. Please upload a DOCX or TXT file." });
    }

    // Fallback treat as UTF-8 text
    const text = buf.toString("utf-8");
    const items = extractFromPlainText(text, tz);
    return res.status(200).json({ items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Parse error" });
  }
}
