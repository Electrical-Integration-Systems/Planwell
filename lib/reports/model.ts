import type { GenericId } from "convex/values";
import template from "@/lib/reports/template.json";

export const reportTemplate = template;
export const reportRendererVersion = "final-without-version-v5";

export type ReportLogo = {
  storageId: GenericId<"_storage">;
  name: string;
  width: number;
  height: number;
};

export type ReportCompany = {
  companyName: string;
  header: string;
  address: string;
  taxId: string;
  registrationNumber: string;
  email: string;
  phone: string;
  website: string;
  footer: string;
  reportPrefix: string;
  defaultTechnician: string;
  defaultNote: string;
  logo?: ReportLogo;
};

export const defaultReportCompany: ReportCompany = {
  companyName: "",
  header: "",
  address: "",
  taxId: "",
  registrationNumber: "",
  email: "",
  phone: "",
  website: "",
  footer: "",
  reportPrefix: "RIT",
  defaultTechnician: "",
  defaultNote: template.note,
};

export type ReportSection = { title: string; body: string };
export type ReportMaterial = { name: string; code: string; unit: string; quantity: number };
export type ReportRecommendation = { description: string; priority: "ridicata" | "medie" | "scazuta" };
export type ReportForm = {
  title: string;
  beneficiary: string;
  location: string;
  equipment: string;
  interventionType: string;
  interventionDate: string;
  duration: string;
  technician: string;
  beneficiaryRepresentative: string;
  finalState: string;
  purpose: string;
  findings: ReportSection[];
  work: ReportSection[];
  materials: ReportMaterial[];
  recommendations: ReportRecommendation[];
  conclusions: string;
  note: string;
};

export type ReportStatus = "draft" | "final";
export type ReportFormat = "docx" | "pdf";
export type ReportSnapshot = {
  number: string;
  version: number;
  status: ReportStatus;
  form: ReportForm;
  company: ReportCompany;
  templateVersion: string;
  logoUrl?: string | null;
};

export const priorityLabels = {
  ridicata: "RIDICATĂ",
  medie: "MEDIE",
  scazuta: "SCĂZUTĂ",
} satisfies Record<ReportRecommendation["priority"], string>;

export function createReportForm(company: ReportCompany): ReportForm {
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    title: "",
    beneficiary: "",
    location: "",
    equipment: "",
    interventionType: "",
    interventionDate: localDate,
    duration: "",
    technician: company.defaultTechnician,
    beneficiaryRepresentative: "",
    finalState: "",
    purpose: "",
    findings: [{ title: "", body: "" }],
    work: [{ title: "", body: "" }],
    materials: [],
    recommendations: [],
    conclusions: "",
    note: company.defaultNote,
  };
}

export function formatReportDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

export function reportGeneralRows(snapshot: ReportSnapshot): string[][] {
  const { form, company } = snapshot;
  return [
    ["Beneficiar", form.beneficiary],
    ["Locație intervenție", form.location],
    ["Prestator", company.companyName],
    ["Echipamente", form.equipment],
    ["Tip intervenție", form.interventionType],
    ["Data intervenției", formatReportDate(form.interventionDate)],
    ["Durata intervenției", form.duration],
    ["Executant", form.technician.trim() || company.defaultTechnician.trim()],
    ["Reprezentant beneficiar", form.beneficiaryRepresentative],
    ["Stare la finalul intervenției", form.finalState],
  ].filter(([, value]) => value.trim()).map(([label, value]) => [label, value.trim()]);
}

export type ReportBlock =
  | { type: "heading"; text: string; level: 1 | 2 }
  | { type: "text"; text: string; size?: number }
  | { type: "table"; rows: string[][]; widths: number[]; header: boolean; keepTogether?: boolean; signatureRow?: number };

export function reportSigners(snapshot: ReportSnapshot) {
  const { form, company } = snapshot;
  const beneficiary = form.beneficiary.trim();
  const representative = form.beneficiaryRepresentative.trim();
  return [
    { label: "EXECUTANT / ÎNTOCMIT", name: form.technician.trim() || company.defaultTechnician.trim(), signature: "Semnătura:" },
    { label: "BENEFICIAR", name: [beneficiary, representative && representative !== beneficiary ? `Reprezentant: ${representative}` : ""].filter(Boolean).join("\n"), signature: "Semnătura / ștampila:" },
  ];
}

export function reportIssuerLines(company: ReportCompany): string[] {
  return [
    company.companyName.trim(),
    company.header.trim(),
    company.address.trim(),
    [company.taxId.trim() && `CUI: ${company.taxId.trim()}`, company.registrationNumber.trim()].filter(Boolean).join(" · "),
    [company.email, company.phone, company.website].map((value) => value.trim()).filter(Boolean).join(" · "),
  ].filter(Boolean);
}

export function reportMetadata(snapshot: ReportSnapshot): string {
  return [
    [snapshot.number.trim() && `Nr. ${snapshot.number.trim()}`, formatReportDate(snapshot.form.interventionDate)].filter(Boolean).join(" / "),
    snapshot.status === "draft" ? `Versiunea ${snapshot.version}` : "",
    snapshot.status === "draft" ? "CIORNĂ" : "",
  ].filter(Boolean).join(" · ");
}

// Both document formats use the same populated fields, columns and section numbering.
export function reportContent(snapshot: ReportSnapshot): ReportBlock[] {
  const { form } = snapshot;
  const blocks: ReportBlock[] = [];
  let sectionNumber = 0;

  function section(templateIndex: number, content: (number: number) => ReportBlock[]) {
    const contentBlocks = content(sectionNumber + 1);
    if (!contentBlocks.length) return;
    sectionNumber += 1;
    blocks.push({ type: "heading", text: `${sectionNumber}. ${reportTemplate.headings[templateIndex].replace(/^\d+\.\s*/, "")}`, level: 1 }, ...contentBlocks);
  }

  const rows = reportGeneralRows(snapshot);
  section(0, () => rows.length ? [{ type: "table", rows, widths: [0.3, 0.7], header: false }] : []);
  section(1, () => form.purpose.trim() ? [{ type: "text", text: form.purpose.trim() }] : []);

  for (const [templateIndex, sections] of [[2, form.findings], [3, form.work]] as const) {
    section(templateIndex, (number) => sections.filter((item) => item.title.trim() || item.body.trim()).flatMap((item, index) => {
      const content: ReportBlock[] = [];
      if (item.title.trim()) content.push({ type: "heading", text: `${number}.${index + 1}. ${item.title.trim()}`, level: 2 });
      if (item.body.trim()) content.push({ type: "text", text: item.body.trim() });
      return content;
    }));
  }

  const materials = form.materials.filter((item) => item.name.trim());
  if (materials.length) {
    const columns = [
      { label: "Nr.", width: 0.07, value: (_item: ReportMaterial, index: number) => String(index + 1), include: true },
      { label: "Denumire", width: 0.43, value: (item: ReportMaterial) => item.name.trim(), include: true },
      { label: "Tip / cod", width: 0.23, value: (item: ReportMaterial) => item.code.trim(), include: materials.some((item) => item.code.trim()) },
      { label: "UM", width: 0.1, value: (item: ReportMaterial) => item.unit.trim(), include: materials.some((item) => item.unit.trim()) },
      { label: "Cantitate", width: 0.17, value: (item: ReportMaterial) => String(item.quantity), include: true },
    ].filter((column) => column.include);
    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
    section(4, () => [{ type: "table", header: true, widths: columns.map((column) => column.width / totalWidth), rows: [
      columns.map((column) => column.label),
      ...materials.map((item, index) => columns.map((column) => column.value(item, index))),
    ] }]);
  }

  const recommendations = form.recommendations.filter((item) => item.description.trim());
  section(5, () => recommendations.length ? [{ type: "table", header: true, widths: [0.07, 0.74, 0.19], rows: [
    ["Nr.", "Lucrare recomandată", "Prioritate"],
    ...recommendations.map((item, index) => [String(index + 1), item.description.trim(), priorityLabels[item.priority]]),
  ] }] : []);
  section(6, () => form.conclusions.trim() ? [{ type: "text", text: form.conclusions.trim() }] : []);
  if (form.note.trim()) blocks.push({ type: "text", text: form.note.trim(), size: 9 });

  const signers = reportSigners(snapshot);
  const signatureRows = [signers.map((signer) => signer.label)];
  if (signers.some((signer) => signer.name)) signatureRows.push(signers.map((signer) => signer.name));
  const signatureRow = signatureRows.length;
  signatureRows.push(signers.map((signer) => signer.signature));
  if (form.interventionDate.trim()) signatureRows.push(signers.map(() => `Data: ${formatReportDate(form.interventionDate)}`));
  // Signing areas are structural, even when optional names are not filled in yet.
  section(7, () => [{ type: "table", header: true, widths: [0.5, 0.5], rows: signatureRows, keepTogether: true, signatureRow }]);
  return blocks;
}

function filenamePart(value: string, maxBytes: number): string {
  const clean = value.normalize("NFC").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const encoder = new TextEncoder();
  let result = "";
  let length = 0;
  for (const character of clean) {
    const size = encoder.encode(character).length;
    if (length + size > maxBytes) break;
    result += character;
    length += size;
  }
  return result.replace(/-+$/g, "");
}

export function reportFilename(snapshot: ReportSnapshot, format: ReportFormat): string {
  const parts = [
    "Raport-interventie",
    filenamePart(snapshot.number, 48),
    filenamePart(snapshot.form.location, 120),
    filenamePart(snapshot.form.interventionDate, 10),
  ].filter(Boolean);
  const revision = snapshot.status === "draft" ? `-v${snapshot.version}` : "";
  return `${parts.join("-")}${revision}.${format}`;
}
