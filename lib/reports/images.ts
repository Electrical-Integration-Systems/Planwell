import { reportImageMaxBytes } from "@/lib/reports/model";
import type { ReportImage, ReportSnapshot } from "@/lib/reports/model";

export async function loadReportImage(snapshot: ReportSnapshot, image: ReportImage): Promise<Uint8Array> {
  const url = snapshot.imageUrls?.[image.storageId];
  if (!url) throw new Error(`Imaginea „${image.name}” nu este disponibilă. Reîncarcă raportul.`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imaginea „${image.name}” nu a putut fi încărcată.`);
  return new Uint8Array(await response.arrayBuffer());
}

export function reportImageCaption(image: ReportImage, index: number): string {
  return `Figura ${index + 1}. ${image.caption.trim() || image.name}`;
}

export async function prepareReportImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Alege o imagine PNG, JPG sau WebP.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Imaginea originală poate avea maximum 20 MB.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Fișierul nu conține o imagine validă."); });
  if (bitmap.width > 16000 || bitmap.height > 16000) {
    bitmap.close();
    throw new Error("Imaginea poate avea latura de maximum 16.000 px.");
  }
  const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Browserul nu poate pregăti imaginea.");
  }
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size > reportImageMaxBytes) throw new Error("Imaginea pregătită depășește 1 MB. Alege o imagine mai mică.");
  return { blob, width, height, name: `${file.name.replace(/\.[^.]+$/, "").slice(0, 190)}.jpg` };
}
