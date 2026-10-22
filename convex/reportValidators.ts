import { v } from "convex/values";

export const reportLogoValidator = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  width: v.number(),
  height: v.number(),
});

export const reportCompanyValidator = v.object({
  companyName: v.string(),
  header: v.string(),
  address: v.string(),
  taxId: v.string(),
  registrationNumber: v.string(),
  email: v.string(),
  phone: v.string(),
  website: v.string(),
  footer: v.string(),
  reportPrefix: v.string(),
  defaultTechnician: v.string(),
  defaultNote: v.string(),
  logo: v.optional(reportLogoValidator),
});

const section = v.object({ title: v.string(), body: v.string() });

export const reportFormValidator = v.object({
  title: v.string(),
  beneficiary: v.string(),
  location: v.string(),
  equipment: v.string(),
  interventionType: v.string(),
  interventionDate: v.string(),
  duration: v.string(),
  technician: v.string(),
  beneficiaryRepresentative: v.string(),
  finalState: v.string(),
  purpose: v.string(),
  findings: v.array(section),
  work: v.array(section),
  materials: v.array(v.object({ name: v.string(), code: v.string(), unit: v.string(), quantity: v.number() })),
  recommendations: v.array(v.object({
    description: v.string(),
    priority: v.union(v.literal("ridicata"), v.literal("medie"), v.literal("scazuta")),
  })),
  conclusions: v.string(),
  note: v.string(),
});

export const reportStatusValidator = v.union(v.literal("draft"), v.literal("final"));
export const reportFormatValidator = v.union(v.literal("docx"), v.literal("pdf"));
