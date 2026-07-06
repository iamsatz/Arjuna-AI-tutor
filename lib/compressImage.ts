const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.85;

/** Resize photos for upload; PDFs and small files pass through unchanged. */
export async function prepareUploadFile(file: File): Promise<File> {
  if (file.type === "application/pdf" || !file.type.startsWith("image/")) {
    return file;
  }
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

export async function prepareUploadFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(prepareUploadFile));
}
