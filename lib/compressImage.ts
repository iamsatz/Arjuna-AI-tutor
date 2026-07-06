import { pdfToImageFiles } from "@/lib/pdfToImages";

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.85;
export const MAX_UPLOAD_FILES = 5;

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 400_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Expand PDF to JPEG pages; resize photos; pass other files through. */
export async function prepareUploadFile(file: File): Promise<File[]> {
  if (file.type === "application/pdf") {
    try {
      const pages = await pdfToImageFiles(file);
      if (pages.length > 0) {
        const compressed = await Promise.all(
          pages.map((p) => compressImageFile(p)),
        );
        return compressed;
      }
    } catch {
      // fall through — server may still reject with pdf_unsupported
    }
    return [file];
  }

  if (!file.type.startsWith("image/")) {
    return [file];
  }

  return [await compressImageFile(file)];
}

export async function prepareUploadFiles(files: File[]): Promise<File[]> {
  const expanded: File[] = [];
  for (const file of files) {
    const prepared = await prepareUploadFile(file);
    expanded.push(...prepared);
  }
  return expanded.slice(0, MAX_UPLOAD_FILES);
}

/** @deprecated use prepareUploadFiles — returns first file only */
export async function prepareUploadFileLegacy(file: File): Promise<File> {
  const list = await prepareUploadFile(file);
  return list[0] ?? file;
}
