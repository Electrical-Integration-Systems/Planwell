import type { ReportSnapshot } from "@/lib/reports/model";

export async function loadReportLogo(snapshot: ReportSnapshot): Promise<Uint8Array | null> {
  if (!snapshot.company.logo) return null;
  if (!snapshot.logoUrl) throw new Error("Logo-ul raportului nu este disponibil. Reîncarcă pagina și încearcă din nou.");
  const response = await fetch(snapshot.logoUrl);
  if (!response.ok) throw new Error("Logo-ul nu a putut fi încărcat pentru document.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function prepareReportLogo(file: File): Promise<{ blob: Blob; name: string; width: number; height: number }> {
  if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Alege un fișier PNG sau JPG.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Logo-ul poate avea maximum 2 MB.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Fișierul nu conține o imagine PNG sau JPG validă."); });
  if (bitmap.width > 8000 || bitmap.height > 8000) {
    bitmap.close();
    throw new Error("Imaginea este prea mare. Folosește un logo cu latura de maximum 8.000 px.");
  }
  const scale = Math.min(1, 1200 / bitmap.width, 600 / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Browserul nu poate pregăti imaginea. Încearcă într-un alt browser.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error("Imaginea pregătită depășește 2 MB. Folosește un logo mai simplu.");
  return { blob, name: `${file.name.replace(/\.[^.]+$/, "").slice(0, 190)}.png`, width, height };
}
