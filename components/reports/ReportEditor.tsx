"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import Image from "next/image";
import { Download, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { ReportField } from "@/components/reports/ReportField";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { prepareReportImage } from "@/lib/reports/images";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createReportForm, priorityLabels, reportFilename, reportImageLimit, reportRendererVersion, reportSigners, reportTemplate } from "@/lib/reports/model";
import type { ReportCompany, ReportFormat, ReportForm, ReportSection, ReportSnapshot, ReportStatus } from "@/lib/reports/model";
import { normalizeReportForm, reportFinalRequiredFields, reportSaveErrorMessage, reportValidationIssues } from "@/lib/reports/validation";
import type { ReportValidationIssue } from "@/lib/reports/validation";

type StoredVersion = Doc<"technicalReportVersions"> & {
  logoUrl?: string | null;
  imageUrls?: Record<string, string | null>;
  exports: (Doc<"technicalReportExports"> & { url: string | null })[];
};
type HistoryItem = { _id: Id<"technicalReportVersions">; version: number; status: ReportStatus; createdAt: number };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function ReportEditor({ storedVersion, currentCompany, currentLogoUrl, latestVersion = 0, history = [], onSaved, onVersionChange, onClose }: {
  storedVersion?: StoredVersion;
  currentCompany: ReportCompany;
  currentLogoUrl?: string | null;
  latestVersion?: number;
  history?: HistoryItem[];
  onSaved: (reportId: Id<"technicalReports">, versionId: Id<"technicalReportVersions">) => void;
  onVersionChange?: (id: Id<"technicalReportVersions">) => void;
  onClose: () => void;
}) {
  const save = useMutation(api.technicalReports.save);
  const generateUploadUrl = useMutation(api.technicalReports.generateUploadUrl);
  const attachExport = useMutation(api.technicalReports.attachExport);
  const registerImage = useMutation(api.technicalReports.registerImage);
  const [form, setForm] = useState<ReportForm>(() => storedVersion?.form ?? createReportForm(currentCompany));
  const [company, setCompany] = useState(storedVersion?.company ?? currentCompany);
  const [logoUrl, setLogoUrl] = useState(storedVersion ? storedVersion.logoUrl : currentLogoUrl);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>(storedVersion?.imageUrls ?? {});
  const [expectedVersion] = useState(latestVersion);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ReportValidationIssue[]>([]);
  const [validationStatus, setValidationStatus] = useState<ReportStatus>("draft");
  const [previewVisible, setPreviewVisible] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<{ versionId?: Id<"technicalReportVersions"> } | null>(null);
  const dirty = storedVersion ? JSON.stringify(form) !== JSON.stringify(storedVersion.form) || JSON.stringify(company) !== JSON.stringify(storedVersion.company) : true;
  const snapshot: ReportSnapshot = {
    number: storedVersion?.number ?? "",
    version: storedVersion?.version ?? 1,
    status: storedVersion?.status ?? "draft",
    form,
    company,
    logoUrl,
    imageUrls,
    templateVersion: storedVersion?.templateVersion ?? reportTemplate.sourceSha256,
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setValidationIssues((current) => current.length ? reportValidationIssues({ ...form, [key]: value }, company, validationStatus) : current);
  }

  function field(key: { [K in keyof ReportForm]-?: ReportForm[K] extends string ? K : never }[keyof ReportForm], label: string, multiline = false, required = false) {
    const hint = key === "technician" && company.defaultTechnician.trim()
      ? `Executant implicit: ${company.defaultTechnician.trim()}. Se folosește dacă lași câmpul gol.`
      : reportFinalRequiredFields.some((name) => name === key) ? "Necesar la finalizare." : undefined;
    return <ReportField key={key} fieldName={key} label={label} value={form[key]} multiline={multiline} required={required} disabled={busy !== null} type={key === "interventionDate" ? "date" : "text"} hint={hint} error={validationIssues.find((issue) => issue.field === key)?.message} onChange={(value) => update(key, value)} />;
  }

  function saveVersion(status: ReportStatus) {
    setError(null);
    setValidationStatus(status);
    const issues = reportValidationIssues(form, company, status);
    setValidationIssues(issues);
    if (issues.length) {
      const target = document.querySelector<HTMLElement>(`[data-report-field="${issues[0].field}"]`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy("save");
    void save({ reportId: storedVersion?.reportId, expectedVersion, form: normalizeReportForm(form, company), company, status }).then((result) => {
      toast.success(`Raport ${result.number}, versiunea ${result.version}, salvat.`);
      onSaved(result.reportId, result.versionId);
    }).catch((cause: unknown) => setError(reportSaveErrorMessage(cause))).finally(() => setBusy(null));
  }

  async function exportVersion(format: ReportFormat) {
    if (!storedVersion || dirty) return;
    const filename = reportFilename(storedVersion, format);
    const existing = storedVersion.exports.find((file) => file.format === format && file.rendererVersion === reportRendererVersion && file.url);
    if (existing?.url) {
      const response = await fetch(existing.url);
      if (!response.ok) throw new Error("Fișierul arhivat nu a putut fi descărcat.");
      downloadBlob(await response.blob(), filename);
      return;
    }
    const contentType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const generated = format === "pdf"
      ? await import("@/lib/reports/exportPdf").then((module) => module.buildReportPdf(storedVersion))
      : await import("@/lib/reports/exportDocx").then((module) => module.buildReportDocx(storedVersion));
    const blob = new Blob([generated], { type: contentType });
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": contentType }, body: blob });
    if (!response.ok) throw new Error("Fișierul nu a putut fi salvat în istoric. Încearcă din nou.");
    const uploaded: unknown = await response.json();
    if (!uploaded || typeof uploaded !== "object" || !("storageId" in uploaded) || typeof uploaded.storageId !== "string") {
      throw new Error("Răspuns invalid la încărcarea documentului.");
    }
    const url = await attachExport({ versionId: storedVersion._id, format, storageId: uploaded.storageId as Id<"_storage">, rendererVersion: reportRendererVersion });
    if (!url) throw new Error("Exportul a fost salvat, dar linkul de descărcare nu este disponibil.");
    // Download the archived result, including a concurrently generated first export.
    const archived = await fetch(url);
    if (!archived.ok) throw new Error("Exportul este salvat în istoric, dar descărcarea a eșuat. Reîncearcă.");
    downloadBlob(await archived.blob(), filename);
  }

  function startExport(format: ReportFormat) {
    setBusy(format);
    setError(null);
    void exportVersion(format).then(() => toast.success("Documentul a fost arhivat și descărcat.")).catch((cause: Error) => setError(cause.message)).finally(() => setBusy(null));
  }

  async function uploadImages(files: File[]) {
    if ((form.images?.length ?? 0) + files.length > reportImageLimit) throw new Error(`Poți adăuga cel mult ${reportImageLimit} imagini în anexe.`);
    for (const file of files) {
      const prepared = await prepareReportImage(file);
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: prepared.blob });
      if (!response.ok) throw new Error(`Imaginea „${file.name}” nu a putut fi încărcată.`);
      const uploaded: unknown = await response.json();
      if (!uploaded || typeof uploaded !== "object" || !("storageId" in uploaded) || typeof uploaded.storageId !== "string") throw new Error("Încărcarea nu a returnat o imagine validă.");
      const result = await registerImage({ image: { storageId: uploaded.storageId as Id<"_storage">, name: prepared.name, width: prepared.width, height: prepared.height, caption: "" } });
      if (!result.url) throw new Error("Imaginea încărcată nu este disponibilă.");
      setImageUrls((previous) => ({ ...previous, [result.image.storageId]: result.url }));
      setForm((previous) => ({ ...previous, images: [...(previous.images ?? []), result.image] }));
    }
  }

  function navigate(versionId?: Id<"technicalReportVersions">) {
    if (dirty) setPendingNavigation({ versionId });
    else if (versionId) onVersionChange?.(versionId);
    else onClose();
  }

  function sections(key: "findings" | "work", title: string) {
    function setSection(index: number, patch: Partial<ReportSection>) {
      update(key, form[key].map((section, row) => row === index ? { ...section, ...patch } : section));
    }
    return <Card data-report-field={key} tabIndex={-1}><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Adaugă câte o subsecțiune pentru fiecare echipament, constatare sau lucrare.{key === "work" && " Pentru finalizare este necesară descrierea pentru cel puțin o lucrare."}</CardDescription></CardHeader><CardContent className="space-y-5">
      {validationIssues.find((issue) => issue.field === key) && <p role="alert" className="text-sm text-destructive">{validationIssues.find((issue) => issue.field === key)?.message}</p>}
      {form[key].map((section, index) => <Card key={index} className="gap-3 bg-muted/20 py-4"><CardContent className="space-y-4 px-4">
        <div className="flex items-center justify-between gap-3"><Label>{key === "findings" ? "3" : "4"}.{index + 1}</Label><Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => update(key, form[key].filter((_, row) => row !== index))}><Trash2 className="size-4" />Elimină</Button></div>
        <ReportField label="Titlu subsecțiune" value={section.title} disabled={busy !== null} onChange={(value) => setSection(index, { title: value })} />
        <ReportField label={key === "findings" ? "Constatări" : "Lucrări efectuate"} multiline value={section.body} disabled={busy !== null} onChange={(value) => setSection(index, { body: value })} />
      </CardContent></Card>)}
      <Button type="button" variant="outline" disabled={busy !== null || form[key].length >= 100} onClick={() => update(key, [...form[key], { title: "", body: "" }])}><Plus className="size-4" />Adaugă subsecțiune</Button>
    </CardContent></Card>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2"><h1 className="text-2xl font-semibold">{storedVersion ? storedVersion.number : "Raport nou"}</h1><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{snapshot.status === "draft" ? "Ciornă" : "Finalizat"}</Badge>{dirty && <Badge variant="outline">Modificări nesalvate</Badge>}</div></div>
        <Button variant="outline" disabled={busy !== null} onClick={() => navigate()}>Înapoi la istoric</Button>
      </div>
      {history.length > 0 && <div className="flex flex-wrap items-center gap-3"><Label htmlFor="report-version">Versiune</Label><Select value={storedVersion?._id} disabled={busy !== null} onValueChange={(value) => navigate(value as Id<"technicalReportVersions">)}><SelectTrigger id="report-version" className="w-full sm:w-96"><SelectValue /></SelectTrigger><SelectContent>{history.map((item) => <SelectItem key={item._id} value={item._id}>v{item.version} · {item.status === "draft" ? "Ciornă" : "Finalizat"} · {new Date(item.createdAt).toLocaleString("ro-RO")}</SelectItem>)}</SelectContent></Select></div>}
      {storedVersion && storedVersion.version < latestVersion && <p className="text-sm text-muted-foreground">Ai deschis o versiune anterioară. Salvarea creează o versiune nouă; versiunile existente rămân în istoric.</p>}
      <Card className="gap-3 py-4"><CardContent className="flex flex-wrap items-center gap-3">
        <Button disabled={busy !== null} onClick={() => saveVersion("draft")}><Save className="size-4" />{busy === "save" ? "Se salvează…" : "Salvează versiune"}</Button>
        <Button variant="secondary" disabled={busy !== null} onClick={() => saveVersion("final")}>Finalizează raportul</Button>
        <Button variant="outline" disabled={busy !== null || dirty || !storedVersion} onClick={() => startExport("docx")}><Download className="size-4" />{busy === "docx" ? "Se generează…" : "Descarcă Word"}</Button>
        <Button variant="outline" disabled={busy !== null || dirty || !storedVersion} onClick={() => startExport("pdf")}><Download className="size-4" />{busy === "pdf" ? "Se generează…" : "Descarcă PDF"}</Button>
        {dirty && <p className="w-full text-xs text-muted-foreground">Salvează modificările înainte de export. Documentele generate se păstrează în istoricul versiunii.</p>}
        {storedVersion && storedVersion.exports.length > 0 && <p className="w-full text-xs text-muted-foreground">Fișiere arhivate: {storedVersion.exports.map((file) => `${file.format.toUpperCase()} (${new Date(file.createdAt).toLocaleString("ro-RO")})${file.rendererVersion === reportRendererVersion ? "" : " – format precedent"}`).join(" · ")}</p>}
      </CardContent></Card>
      {error && <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">{error}</p>}
      {validationIssues.length > 0 && <Card role="alert" className="border-destructive/40"><CardHeader><CardTitle>{validationStatus === "final" ? "Raportul nu poate fi finalizat încă" : "Raportul nu poate fi salvat încă"}</CardTitle><CardDescription>{validationStatus === "final" ? "Completează câmpurile de mai jos. Poți salva raportul ca ciornă înainte de finalizare." : "Completează câmpurile de mai jos pentru a salva ciorna."}</CardDescription></CardHeader><CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-destructive">{validationIssues.map((issue) => <li key={issue.field}>{issue.message}</li>)}</ul></CardContent></Card>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Completarea raportului</h2>
        <Button variant="outline" aria-expanded={previewVisible} aria-controls="report-pdf-preview" onClick={() => setPreviewVisible((visible) => !visible)}>
          {previewVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {previewVisible ? "Ascunde previzualizarea" : "Arată previzualizarea"}
        </Button>
      </div>
      <div className={cn("grid items-start gap-6", previewVisible && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
        <section aria-label="Formularul raportului" className="min-w-0 space-y-5">
          <Card data-report-field="companyName" tabIndex={-1}><CardHeader><CardTitle>Antet și firmă</CardTitle><CardDescription>Raportul păstrează datele firmei și logo-ul folosite la salvare.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm">{company.companyName || "Firma nu este încă configurată."}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{company.header}</p>{company.logo && <p className="text-xs text-muted-foreground">Logo: {company.logo.name}</p>}{validationIssues.find((issue) => issue.field === "companyName") && <p role="alert" className="text-sm text-destructive">{validationIssues.find((issue) => issue.field === "companyName")?.message}</p>}<Button variant="outline" disabled={busy !== null || JSON.stringify(company) === JSON.stringify(currentCompany)} onClick={() => { setCompany(currentCompany); setLogoUrl(currentLogoUrl); setValidationIssues((current) => current.length ? reportValidationIssues(form, currentCompany, validationStatus) : current); }}>Aplică datele curente din configurare</Button></CardContent></Card>
          <Card><CardHeader><CardTitle>{reportTemplate.headings[0]}</CardTitle><CardDescription>Titlul și beneficiarul sunt obligatorii pentru salvarea ciornei. Finalizarea necesită și locația, executantul, scopul, lucrările, starea finală și concluziile.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
            {field("title", "Titlul / obiectul intervenției", false, true)}{field("beneficiary", "Beneficiar", false, true)}
            {field("location", "Locație intervenție")}{field("interventionType", "Tip intervenție")}
            {field("interventionDate", "Data intervenției", false, true)}{field("duration", "Durată (ex.: 6 ore)")}
            {field("technician", "Executant / întocmit")}{field("beneficiaryRepresentative", "Reprezentant beneficiar")}
            {field("equipment", "Echipamente", true)}{field("finalState", "Stare la finalul intervenției", true)}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{reportTemplate.headings[1]}</CardTitle></CardHeader><CardContent>{field("purpose", "Scopul și motivul intervenției", true)}</CardContent></Card>
          {sections("findings", reportTemplate.headings[2])}{sections("work", reportTemplate.headings[3])}
          <Card><CardHeader><CardTitle>{reportTemplate.headings[4]}</CardTitle></CardHeader><CardContent className="space-y-5">
            {form.materials.length === 0 && <p className="text-sm text-muted-foreground">Nu sunt adăugate materiale.</p>}
            {form.materials.map((material, index) => <Card key={index} className="gap-3 bg-muted/20 py-4"><CardContent className="space-y-4 px-4"><div className="flex justify-between"><Label>Material {index + 1}</Label><Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => update("materials", form.materials.filter((_, row) => row !== index))}><Trash2 className="size-4" />Elimină</Button></div><div className="grid gap-4 sm:grid-cols-2">
              {([['name', 'Denumire'], ['code', 'Tip / cod'], ['unit', 'Unitate de măsură']] as const).map(([key, label]) => <ReportField key={key} label={label} value={material[key]} disabled={busy !== null} onChange={(value) => update("materials", form.materials.map((item, row) => row === index ? { ...item, [key]: value } : item))} />)}
              <ReportField label="Cantitate" type="number" value={String(material.quantity)} disabled={busy !== null} onChange={(value) => { const quantity = Number(value.replace(",", ".")); if (Number.isFinite(quantity)) update("materials", form.materials.map((item, row) => row === index ? { ...item, quantity } : item)); }} />
            </div></CardContent></Card>)}
            <Button variant="outline" disabled={busy !== null || form.materials.length >= 100} onClick={() => update("materials", [...form.materials, { name: "", code: "", unit: "buc", quantity: 1 }])}><Plus className="size-4" />Adaugă material</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{reportTemplate.headings[5]}</CardTitle></CardHeader><CardContent className="space-y-5">
            {form.recommendations.length === 0 && <p className="text-sm text-muted-foreground">Nu sunt adăugate recomandări.</p>}
            {form.recommendations.map((recommendation, index) => <Card key={index} className="gap-3 bg-muted/20 py-4"><CardContent className="space-y-4 px-4"><div className="flex justify-between"><Label>Recomandare {index + 1}</Label><Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => update("recommendations", form.recommendations.filter((_, row) => row !== index))}><Trash2 className="size-4" />Elimină</Button></div>
              <ReportField label="Lucrare recomandată" multiline value={recommendation.description} disabled={busy !== null} onChange={(value) => update("recommendations", form.recommendations.map((item, row) => row === index ? { ...item, description: value } : item))} />
              <div className="space-y-2"><Label htmlFor={`priority-${index}`}>Prioritate</Label><Select value={recommendation.priority} disabled={busy !== null} onValueChange={(value) => { if (value === "ridicata" || value === "medie" || value === "scazuta") update("recommendations", form.recommendations.map((item, row) => row === index ? { ...item, priority: value } : item)); }}><SelectTrigger id={`priority-${index}`}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(priorityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            </CardContent></Card>)}
            <Button variant="outline" disabled={busy !== null || form.recommendations.length >= 100} onClick={() => update("recommendations", [...form.recommendations, { description: "", priority: "medie" }])}><Plus className="size-4" />Adaugă recomandare</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{reportTemplate.headings[6]}</CardTitle></CardHeader><CardContent className="space-y-5">{field("conclusions", "Concluzii", true)}{field("note", "Notă", true)}</CardContent></Card>
          <Card><CardHeader><CardTitle>{reportTemplate.headings[7]}</CardTitle><CardDescription>Numele sunt preluate din datele generale și configurarea firmei. Beneficiarul apare și dacă reprezentantul nu este completat. Ambele spații pentru semnătură sunt incluse întotdeauna în document.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2">{reportSigners(snapshot).map((signer) => <div key={signer.label} className="space-y-2"><p className="font-medium">{signer.label}</p>{signer.name && <p className="whitespace-pre-wrap">{signer.name}</p>}<p>{signer.signature}</p></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Anexe</CardTitle><CardDescription>Adaugă până la {reportImageLimit} imagini PNG, JPG sau WebP, de maximum 20 MB fiecare. Imaginile sunt optimizate pentru document. Secțiunea apare la finalul raportului doar dacă are imagini atașate.</CardDescription></CardHeader><CardContent className="space-y-5">
            <div className="space-y-2"><Label htmlFor="report-images">Adaugă imagini</Label><Input id="report-images" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy !== null || (form.images?.length ?? 0) >= reportImageLimit} onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (!files.length) return;
              setBusy("images");
              setError(null);
              void uploadImages(files).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Imaginile nu au putut fi încărcate.")).finally(() => setBusy(null));
            }} /></div>
            {busy === "images" && <p role="status" className="text-sm text-muted-foreground">Se încarcă imaginile…</p>}
            {!form.images?.length && <p className="text-sm text-muted-foreground">Nu sunt atașate imagini. Anexele nu vor fi incluse în document.</p>}
            {form.images?.map((image, index) => <Card key={`${image.storageId}-${index}`}><CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3"><Label>Imaginea {index + 1}</Label><Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => update("images", form.images?.filter((_, row) => row !== index))}><Trash2 className="size-4" />Elimină</Button></div>
              {imageUrls[image.storageId] && <Image src={imageUrls[image.storageId]!} alt={image.caption || image.name} width={image.width} height={image.height} unoptimized className="max-h-64 w-auto max-w-full rounded-md object-contain" />}
              <p className="break-all text-xs text-muted-foreground">{image.name}</p>
              <ReportField label="Descriere imagine (opțional)" value={image.caption} maxLength={1000} disabled={busy !== null} onChange={(value) => update("images", form.images?.map((item, row) => row === index ? { ...item, caption: value } : item))} />
            </CardContent></Card>)}
          </CardContent></Card>
          <div className="flex flex-wrap gap-3"><Button disabled={busy !== null} onClick={() => saveVersion("draft")}><Save className="size-4" />Salvează versiune</Button><Button variant="secondary" disabled={busy !== null} onClick={() => saveVersion("final")}>Finalizează raportul</Button></div>
        </section>
        <aside id="report-pdf-preview" aria-label="Previzualizarea PDF a raportului" hidden={!previewVisible} className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          {previewVisible && <ReportPreview snapshot={snapshot} onHide={() => setPreviewVisible(false)} archivedPdfUrl={!dirty ? storedVersion?.exports.find((file) => file.format === "pdf" && file.rendererVersion === reportRendererVersion)?.url ?? undefined : undefined} />}
        </aside>
      </div>
      <ConfirmActionDialog open={pendingNavigation !== null} onOpenChange={(open) => { if (!open) setPendingNavigation(null); }} title="Renunți la modificările nesalvate?" description="Versiunile salvate rămân în istoric. Modificările curente se vor pierde." confirmLabel="Renunță la modificări" onConfirm={() => { const destination = pendingNavigation?.versionId; setPendingNavigation(null); if (destination) onVersionChange?.(destination); else onClose(); }} />
    </>
  );
}
