import { ConvexError } from "convex/values";
import { reportSigningDate } from "@/lib/reports/model";
import type { ReportCompany, ReportForm, ReportStatus } from "@/lib/reports/model";

export type ReportValidationIssue = {
  field: "title" | "beneficiary" | "interventionDate" | "additionalInterventionDates" | "reportDate" | "companyName" | "location" | "technician" | "purpose" | "work" | "finalState" | "conclusions";
  message: string;
};

export const reportFinalRequiredFields = ["location", "technician", "purpose", "finalState", "conclusions"] as const;

export function normalizeReportForm(form: ReportForm, company: ReportCompany): ReportForm {
  return {
    ...form,
    title: form.title.trim(),
    beneficiary: form.beneficiary.trim(),
    technician: form.technician.trim() || company.defaultTechnician.trim(),
    additionalInterventionDates: [...new Set(form.additionalInterventionDates ?? [])].filter((date) => date !== form.interventionDate).sort(),
    reportDate: reportSigningDate(form),
  };
}

export function reportValidationIssues(form: ReportForm, company: ReportCompany, status: ReportStatus): ReportValidationIssue[] {
  const normalized = normalizeReportForm(form, company);
  const issues: ReportValidationIssue[] = [];
  if (!normalized.title) issues.push({ field: "title", message: "Completează titlul / obiectul intervenției." });
  if (!normalized.beneficiary) issues.push({ field: "beneficiary", message: "Completează beneficiarul." });
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate(form.interventionDate)) {
    issues.push({ field: "interventionDate", message: "Completează o dată validă pentru intervenție." });
  }
  if ((form.additionalInterventionDates?.length ?? 0) > 100 || form.additionalInterventionDates?.some((date) => !validDate(date))) {
    issues.push({ field: "additionalInterventionDates", message: "Completează o dată validă pentru fiecare zi de intervenție (maximum 100 de zile suplimentare)." });
  }
  if (!validDate(reportSigningDate(form))) {
    issues.push({ field: "reportDate", message: "Completează o dată validă pentru întocmirea și semnarea raportului." });
  }
  if (status === "final") {
    if (!company.companyName.trim()) issues.push({ field: "companyName", message: "Completează firma prestatoare în configurare și aplică datele firmei în raport." });
    if (!form.location.trim()) issues.push({ field: "location", message: "Completează locația intervenției." });
    if (!normalized.technician) issues.push({ field: "technician", message: "Completează executantul sau executantul implicit din configurarea firmei." });
    if (!form.purpose.trim()) issues.push({ field: "purpose", message: "Completează scopul intervenției." });
    if (!form.work.some((section) => section.body.trim())) issues.push({ field: "work", message: "Completează descrierea pentru cel puțin o lucrare efectuată." });
    if (!form.finalState.trim()) issues.push({ field: "finalState", message: "Completează starea la finalul intervenției." });
    if (!form.conclusions.trim()) issues.push({ field: "conclusions", message: "Completează concluziile." });
  }
  return issues;
}

export function reportSaveErrorMessage(cause: unknown): string {
  if (cause instanceof ConvexError && typeof cause.data === "string") return cause.data;
  return "Raportul nu a putut fi salvat. Încearcă din nou.";
}
