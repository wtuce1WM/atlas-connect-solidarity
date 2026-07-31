/**
 * Compression d'images côté client avant upload Storage.
 * Redimensionne (max 1920px) et ré-encode en WebP pour viser ~300 Ko.
 */

export type CompressResult = {
  file: File;
  originalSize: number;
  finalSize: number;
  compressed: boolean;
};

const MAX_DIMENSION = 1920;
const TARGET_BYTES = 300 * 1024;
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5];

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;
  // GIF animés / SVG : on ne touche pas
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { file, originalSize, finalSize: originalSize, compressed: false };
  }

  try {
    const bitmap = await loadBitmap(file);
    const srcW = "width" in bitmap ? bitmap.width : 0;
    const srcH = "height" in bitmap ? bitmap.height : 0;
    if (!srcW || !srcH) throw new Error("no dimensions");

    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    // Rien à faire : déjà petit et léger
    if (scale === 1 && originalSize <= TARGET_BYTES && file.type === "image/webp") {
      return { file, originalSize, finalSize: originalSize, compressed: false };
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    let best: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality)
      );
      if (!blob) continue;
      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }

    if (!best || best.size >= originalSize) {
      return { file, originalSize, finalSize: originalSize, compressed: false };
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const out = new File([best], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
    return { file: out, originalSize, finalSize: out.size, compressed: true };
  } catch {
    return { file, originalSize, finalSize: originalSize, compressed: false };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
