"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { defaultReportCompany, formatReportDate } from "@/lib/reports/model";
import type { ReportCompany } from "@/lib/reports/model";

export function ReportWorkspace() {
  const reports = useQuery(api.technicalReports.list);
  const settings = useQuery(api.technicalReports.getSettings);
  const [selection, setSelection] = useState<"new" | Id<"technicalReports"> | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  if (reports === undefined || settings === undefined) return <p role="status">Se încarcă rapoartele…</p>;
  const company = settings?.company ?? defaultReportCompany;
  if (selection === "new") return <ReportEditor currentCompany={company} currentLogoUrl={settings?.logoUrl} onClose={() => setSelection(null)} onSaved={(id) => setSelection(id)} />;
  if (selection) return <SavedReport key={selection} reportId={selection} currentCompany={company} currentLogoUrl={settings?.logoUrl} onClose={() => setSelection(null)} />;
  const searchTerm = search.trim().toLocaleLowerCase("ro-RO");
  const filtered = reports.filter((report) => (status === "all" || status === report.status) && `${report.number} ${report.title} ${report.beneficiary}`.toLocaleLowerCase("ro-RO").includes(searchTerm));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Rapoarte de intervenție tehnică</h1><p className="mt-2 text-sm text-muted-foreground">Completează raportul, păstrează versiunile și descarcă documentele Word sau PDF.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/raport-interventie-tehnica/configurare"><Settings className="size-4" />Configurare raport</Link></Button><Button onClick={() => setSelection("new")}><Plus className="size-4" />Raport nou</Button></div></div>
      {!company.companyName && <Card><CardHeader><CardTitle>Configurează firma prestatoare</CardTitle><CardDescription>Adaugă numele firmei, antetul și datele de contact înainte de finalizarea primului raport.</CardDescription></CardHeader><CardContent><Button variant="outline" asChild><Link href="/raport-interventie-tehnica/configurare">Deschide configurarea</Link></Button></CardContent></Card>}
      <Card><CardHeader><CardTitle>Istoric rapoarte</CardTitle><CardDescription>Fiecare salvare creează o versiune nouă. Exporturile păstrează conținutul și datele firmei din versiunea aleasă.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-4"><div className="min-w-56 flex-1 space-y-2"><Label htmlFor="report-search">Caută după număr, titlu sau beneficiar</Label><Input id="report-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută rapoarte…" /></div><div className="w-full space-y-2 sm:w-48"><Label htmlFor="report-status">Stare</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="report-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate</SelectItem><SelectItem value="draft">Ciorne</SelectItem><SelectItem value="final">Finalizate</SelectItem></SelectContent></Select></div></div>
        {filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{reports.length ? "Niciun raport nu corespunde filtrelor." : "Nu există rapoarte încă. Creează primul raport pentru a începe istoricul."}</p> : <Table><TableHeader><TableRow><TableHead>Număr / titlu</TableHead><TableHead>Beneficiar</TableHead><TableHead>Data intervenției</TableHead><TableHead>Stare</TableHead><TableHead>Versiune</TableHead><TableHead>Ultima salvare</TableHead><TableHead><span className="sr-only">Acțiuni</span></TableHead></TableRow></TableHeader><TableBody>{filtered.map((report) => <TableRow key={report._id}><TableCell><p className="font-medium">{report.number}</p><p className="max-w-72 whitespace-normal text-muted-foreground">{report.title}</p></TableCell><TableCell className="whitespace-normal">{report.beneficiary}</TableCell><TableCell>{formatReportDate(report.interventionDate)}</TableCell><TableCell><Badge variant={report.status === "final" ? "default" : "secondary"}>{report.status === "final" ? "Finalizat" : "Ciornă"}</Badge></TableCell><TableCell>v{report.version}</TableCell><TableCell>{new Date(report.updatedAt).toLocaleString("ro-RO")}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => setSelection(report._id)} aria-label={`Deschide raportul ${report.number}`}>Deschide</Button></TableCell></TableRow>)}</TableBody></Table>}
      </CardContent></Card>
    </>
  );
}

function SavedReport({ reportId, currentCompany, currentLogoUrl, onClose }: { reportId: Id<"technicalReports">; currentCompany: ReportCompany; currentLogoUrl?: string | null; onClose: () => void }) {
  const history = useQuery(api.technicalReports.getHistory, { reportId });
  const [selectedVersion, setSelectedVersion] = useState<Id<"technicalReportVersions"> | null>(null);
  const versionId = selectedVersion ?? history?.versions[0]?._id;
  const version = useQuery(api.technicalReports.getVersion, versionId ? { versionId } : "skip");
  if (history === null || version === null) return <Card><CardContent className="space-y-4 pt-6"><p>Raportul sau versiunea nu mai există.</p><Button onClick={onClose}>Înapoi la istoric</Button></CardContent></Card>;
  if (history === undefined || version === undefined) return <p role="status">Se încarcă versiunea raportului…</p>;
  return <ReportEditor key={version._id} storedVersion={version} currentCompany={currentCompany} currentLogoUrl={currentLogoUrl} latestVersion={history.report.version} history={history.versions} onClose={onClose} onVersionChange={setSelectedVersion} onSaved={(_, id) => setSelectedVersion(id)} />;
}
