const MAX_PDF_PAGES = 5;
const RENDER_SCALE = 1.5;
const JPEG_QUALITY = 0.85;

let workerReady = false;

async function ensurePdfWorker() {
  if (workerReady || typeof window === "undefined") return;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  workerReady = true;
}

/** Render PDF pages to JPEG files for Gemini vision (client-side). */
export async function pdfToImageFiles(file: File): Promise<File[]> {
  if (file.type !== "application/pdf") return [file];

  await ensurePdfWorker();
  const pdfjs = await import("pdfjs-dist");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const baseName = file.name.replace(/\.pdf$/i, "") || "page";
  const out: File[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (blob) {
      out.push(
        new File([blob], `${baseName}-p${pageNum}.jpg`, {
          type: "image/jpeg",
        }),
      );
    }
  }

  return out;
}
