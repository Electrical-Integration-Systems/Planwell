"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportField } from "@/components/reports/ReportField";
import { defaultReportCompany } from "@/lib/reports/model";
import { prepareReportLogo } from "@/lib/reports/logo";
import type { Id } from "@/convex/_generated/dataModel";
import type { ReportCompany } from "@/lib/reports/model";

export function ReportSettings() {
  const settings = useQuery(api.technicalReports.getSettings);
  if (settings === undefined) return <p role="status">Se încarcă configurarea…</p>;
  return <SettingsForm initialCompany={settings?.company ?? defaultReportCompany} initialUpdatedAt={settings?.updatedAt ?? null} initialLogoUrl={settings?.logoUrl ?? null} />;
}

function SettingsForm({ initialCompany, initialUpdatedAt, initialLogoUrl }: { initialCompany: ReportCompany; initialUpdatedAt: number | null; initialLogoUrl: string | null }) {
  const saveSettings = useMutation(api.technicalReports.saveSettings);
  const generateUploadUrl = useMutation(api.technicalReports.generateUploadUrl);
  const registerLogo = useMutation(api.technicalReports.registerLogo);
  const [company, setCompany] = useState(initialCompany);
  const [savedCompany, setSavedCompany] = useState(initialCompany);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initialUpdatedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const dirty = JSON.stringify(company) !== JSON.stringify(savedCompany);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function field(key: Exclude<keyof ReportCompany, "logo">, label: string, multiline = false, required = false) {
    return <ReportField key={key} label={label} value={company[key]} multiline={multiline} required={required} maxLength={5000} disabled={busy || uploadingLogo} onChange={(value) => setCompany({ ...company, [key]: value })} />;
  }

  async function uploadLogo(file: File) {
    const prepared = await prepareReportLogo(file);
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/png" }, body: prepared.blob });
    if (!response.ok) throw new Error("Logo-ul nu a putut fi încărcat. Încearcă din nou.");
    const uploaded: unknown = await response.json();
    if (!uploaded || typeof uploaded !== "object" || !("storageId" in uploaded) || typeof uploaded.storageId !== "string") throw new Error("Încărcarea logo-ului nu a returnat un fișier valid.");
    const result = await registerLogo({ logo: { storageId: uploaded.storageId as Id<"_storage">, name: prepared.name, width: prepared.width, height: prepared.height } });
    if (!result.url) throw new Error("Logo-ul încărcat nu este disponibil. Încearcă din nou.");
    setCompany((previous) => ({ ...previous, logo: result.logo }));
    setLogoUrl(result.url);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Configurarea raportului</h1><p className="mt-2 text-sm text-muted-foreground">Date comune pentru rapoartele de intervenție ale întregii echipe.</p></div>
        <Button variant="outline" asChild><Link href="/raport-interventie-tehnica">Înapoi la rapoarte</Link></Button>
      </div>
      <form className="space-y-6" onSubmit={(event) => {
        event.preventDefault();
        if (busy || uploadingLogo) return;
        setBusy(true);
        setError(null);
        void saveSettings({ company, expectedUpdatedAt }).then((updatedAt) => {
          setExpectedUpdatedAt(updatedAt);
          setSavedCompany(company);
          toast.success("Configurarea a fost salvată.");
        }).catch((cause: Error) => setError(cause.message)).finally(() => setBusy(false));
      }}>
        <Card><CardHeader><CardTitle>Logo în antet</CardTitle><CardDescription>PNG sau JPG, maximum 2 MB. Pentru un fundal transparent, folosește PNG. Logo-ul apare pe fiecare pagină în Word și PDF.</CardDescription></CardHeader><CardContent className="space-y-5">
          {company.logo && logoUrl ? <Card className="max-w-sm gap-3 bg-slate-50 p-5 dark:bg-slate-900"><Image src={logoUrl} alt="Logo-ul firmei pentru rapoarte" width={company.logo.width} height={company.logo.height} unoptimized className="max-h-24 w-auto max-w-full object-contain" /><p className="break-all text-xs text-muted-foreground">{company.logo.name}</p></Card> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImagePlus className="size-5" />Niciun logo selectat.</p>}
          <div className="max-w-md space-y-2"><Label htmlFor="report-logo">{company.logo ? "Înlocuiește logo-ul" : "Încarcă logo"}</Label><Input id="report-logo" type="file" accept="image/png,image/jpeg" disabled={busy || uploadingLogo} onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploadingLogo(true);
            setError(null);
            void uploadLogo(file).catch((cause: Error) => setError(cause.message)).finally(() => setUploadingLogo(false));
          }} /></div>
          {uploadingLogo && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Se pregătește și se încarcă logo-ul…</p>}
          {company.logo && <Button type="button" variant="outline" disabled={busy || uploadingLogo} onClick={() => { setCompany({ ...company, logo: undefined }); setLogoUrl(null); }}><Trash2 className="size-4" />Elimină logo-ul</Button>}
          <p className="text-xs text-muted-foreground">Salvează configurarea pentru a aplica logo-ul rapoartelor noi. Rapoartele existente păstrează logo-ul de la salvarea lor.</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Firma prestatoare și antet</CardTitle><CardDescription>Datele de identificare și contact apar în antetul documentelor Word și PDF.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          {field("companyName", "Numele firmei", false, true)}
          {field("taxId", "CUI / cod fiscal")}
          {field("registrationNumber", "Nr. registrul comerțului")}
          {field("address", "Adresă")}
          {field("email", "E-mail")}
          {field("phone", "Telefon")}
          {field("website", "Website")}
          {field("header", "Text suplimentar în antet", true)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Numerotare și texte reutilizabile</CardTitle><CardDescription>Numerele se atribuie automat, de exemplu RIT-2026-0001. Rapoartele salvate păstrează propriile date ale firmei.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          {field("reportPrefix", "Prefix raport", false, true)}
          {field("defaultTechnician", "Executant implicit")}
          {field("defaultNote", "Notă implicită", true)}
          {field("footer", "Subsol document", true)}
        </CardContent></Card>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy || uploadingLogo || (!dirty && initialUpdatedAt !== null)}>{busy ? "Se salvează…" : "Salvează configurarea"}</Button>{dirty && <p className="text-sm text-muted-foreground">Modificări nesalvate</p>}</div>
      </form>
    </>
  );
}
