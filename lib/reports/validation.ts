import { ConvexError } from "convex/values";
import { reportSigningDate } from "@/lib/reports/model";
import type { ReportCompany, ReportForm } from "@/lib/reports/model";

export type ReportValidationIssue = {
  field: "title" | "beneficiary" | "interventionDate" | "additionalInterventionDates" | "reportDate" | "companyName" | "location" | "technician" | "purpose" | "work" | "finalState" | "conclusions";
  message: string;
};

export function normalizeReportForm(form: ReportForm, company: ReportCompany): ReportForm {
  return {
    ...form,
    title: form.title.trim(),
    beneficiary: form.beneficiary.trim(),
    technician: form.technician.trim() || company.defaultTechnician.trim(),
    additionalInterventionDates: [...new Set(form.additionalInterventionDates ?? [])].filter((date) => date.trim() && date !== form.interventionDate).sort(),
    reportDate: reportSigningDate(form),
  };
}

export function reportValidationIssues(form: ReportForm): ReportValidationIssue[] {
  const issues: ReportValidationIssue[] = [];
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (form.interventionDate && !validDate(form.interventionDate)) {
    issues.push({ field: "interventionDate", message: "Completează o dată validă pentru intervenție." });
  }
  if ((form.additionalInterventionDates?.length ?? 0) > 100 || form.additionalInterventionDates?.some((date) => date.trim() && !validDate(date))) {
    issues.push({ field: "additionalInterventionDates", message: "Completează o dată validă pentru fiecare zi de intervenție (maximum 100 de zile suplimentare)." });
  }
  if (reportSigningDate(form) && !validDate(reportSigningDate(form))) {
    issues.push({ field: "reportDate", message: "Completează o dată validă pentru întocmirea și semnarea raportului." });
  }
  return issues;
}

export function reportSaveErrorMessage(cause: unknown): string {
  if (cause instanceof ConvexError && typeof cause.data === "string") return cause.data;
  return "Raportul nu a putut fi salvat. Încearcă din nou.";
}
