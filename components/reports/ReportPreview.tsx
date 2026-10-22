"use client";

import { useEffect, useState } from "react";
import { ExternalLink, EyeOff, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportSnapshot } from "@/lib/reports/model";

type PreviewResult = { key: string; url: string; error?: never } | { key: string; error: string; url?: never };

const viewerClassName = "h-[65dvh] min-h-[360px] w-full lg:h-[calc(100dvh-260px)] lg:min-h-[280px]";

export function ReportPreview({ snapshot, archivedPdfUrl, onHide }: { snapshot: ReportSnapshot; archivedPdfUrl?: string; onHide?: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  // A content key avoids regenerating the PDF for unrelated editor renders.
  const source = JSON.stringify(snapshot);
  const previewKey = JSON.stringify([source, archivedPdfUrl, attempt]);
  const result = preview?.key === previewKey ? preview : null;

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    // Wait for a pause in typing before generating a new PDF.
    const timer = window.setTimeout(() => {
      const task = archivedPdfUrl
        ? fetch(archivedPdfUrl, { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error("PDF-ul arhivat nu a putut fi încărcat.");
          return response.blob();
        })
        : import("@/lib/reports/exportPdf").then((module) => active ? module.buildReportPdf(JSON.parse(source) as ReportSnapshot) : undefined);

      void task.then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPreview({ key: previewKey, url: objectUrl });
      }).catch((cause: unknown) => {
        if (!active) return;
        setPreview({ key: previewKey, error: cause instanceof Error ? cause.message : "PDF-ul nu a putut fi generat." });
      });
    }, archivedPdfUrl ? 0 : 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, archivedPdfUrl, previewKey]);

  return (
    <Card className="gap-4 rounded-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Previzualizare PDF</CardTitle>
          <div className="flex items-center gap-2">
            {result?.url && <Button variant="outline" size="sm" asChild><a href={result.url} target="_blank" rel="noopener noreferrer" aria-label="Deschide PDF într-o filă nouă"><ExternalLink className="size-4" />Deschide PDF</a></Button>}
            {onHide && <Button variant="ghost" size="icon-sm" onClick={onHide} aria-label="Ascunde previzualizarea PDF" title="Ascunde previzualizarea"><EyeOff className="size-4" /></Button>}
          </div>
        </div>
        <CardDescription>
          {archivedPdfUrl ? "Documentul PDF arhivat pentru această versiune." : "PDF generat din datele curente, cu aceeași paginare și același aspect ca la export."}
          {!snapshot.number && " Numărul raportului se atribuie la prima salvare."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!result && <div className={`${viewerClassName} flex items-center justify-center gap-3 text-sm text-muted-foreground`} role="status"><LoaderCircle className="size-5 animate-spin" />Se generează previzualizarea PDF…</div>}
        {result?.error && <div className="space-y-4 py-6"><p role="alert" className="text-sm text-destructive">{result.error}</p><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}><RotateCcw className="size-4" />Încearcă din nou</Button></div>}
        {result?.url && <>
          <iframe title="Previzualizarea PDF a raportului de intervenție tehnică" src={`${result.url}#view=FitH`} className={`${viewerClassName} rounded-lg border bg-slate-100 dark:bg-slate-900`} />
          <p className="mt-3 text-xs text-muted-foreground">Dacă browserul nu afișează documentul aici, folosește butonul „Deschide PDF”.</p>
        </>}
      </CardContent>
    </Card>
  );
}
