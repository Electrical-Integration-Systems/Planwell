import { ConvexError, v } from "convex/values";
import { mutation, query } from "@/convex/_generated/server";
import type { MutationCtx } from "@/convex/_generated/server";
import { requireWhitelistedUser } from "@/convex/authz";
import { logAudit } from "@/convex/auditLog";
import { reportCompanyValidator, reportFormValidator, reportStatusValidator, reportFormatValidator, reportLogoValidator, reportImageValidator } from "@/convex/reportValidators";
import { defaultReportCompany, reportFilename, reportTemplate, reportImageLimit, reportImageMaxBytes } from "@/lib/reports/model";
import type { ReportImage, ReportLogo } from "@/lib/reports/model";
import { normalizeReportForm, reportValidationIssues } from "@/lib/reports/validation";

async function validateLogo(ctx: MutationCtx, logo: ReportLogo | undefined) {
  if (!logo) return;
  const registered = await ctx.db.query("technicalReportLogos").withIndex("by_storage", (q) => q.eq("logo.storageId", logo.storageId)).unique();
  if (!registered || registered.logo.name !== logo.name || registered.logo.width !== logo.width || registered.logo.height !== logo.height) {
    throw new ConvexError("Logo-ul nu este valid. Încarcă imaginea din nou în configurare.");
  }
}

async function validateImage(ctx: MutationCtx, image: ReportImage) {
  const metadata = await ctx.db.system.get(image.storageId);
  if (!metadata || metadata.contentType !== "image/jpeg" || metadata.size === 0 || metadata.size > reportImageMaxBytes) {
    throw new ConvexError("Imaginea din anexă trebuie să fie JPEG de maximum 1 MB.");
  }
  if (!image.name.trim() || image.name.length > 200 || image.caption.length > 1000 || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 1600 || image.height > 1600) {
    throw new ConvexError("Datele imaginii din anexă nu sunt valide.");
  }
}

export const registerImage = mutation({
  args: { image: reportImageValidator },
  handler: async (ctx, args) => {
    await requireWhitelistedUser(ctx);
    await validateImage(ctx, args.image);
    return { image: args.image, url: await ctx.storage.getUrl(args.image.storageId) };
  },
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireWhitelistedUser(ctx);
    const settings = await ctx.db.query("technicalReportSettings").withIndex("by_key", (q) => q.eq("key", "workspace")).unique();
    return settings ? { ...settings, logoUrl: settings.company.logo ? await ctx.storage.getUrl(settings.company.logo.storageId) : null } : null;
  },
});

export const saveSettings = mutation({
  args: { company: reportCompanyValidator, expectedUpdatedAt: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    if (!args.company.companyName.trim()) throw new Error("Completează numele firmei.");
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(args.company.reportPrefix)) {
      throw new Error("Prefixul trebuie să conțină 1–20 litere fără diacritice, cifre, cratimă sau underscore.");
    }
    if (Object.values(args.company).some((value) => typeof value === "string" && value.length > 5000)) throw new Error("Un câmp depășește 5.000 de caractere.");
    await validateLogo(ctx, args.company.logo);
    const existing = await ctx.db.query("technicalReportSettings").withIndex("by_key", (q) => q.eq("key", "workspace")).unique();
    if ((existing?.updatedAt ?? null) !== args.expectedUpdatedAt) {
      throw new Error("Configurarea a fost modificată de alt utilizator. Reîncarcă pagina înainte de a salva.");
    }
    const fields = { company: args.company, updatedBy: userId, updatedAt: Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1) };
    const id = existing?._id ?? await ctx.db.insert("technicalReportSettings", { key: "workspace", ...fields });
    if (existing) await ctx.db.patch(existing._id, fields);
    await logAudit(ctx, { userId, action: "update", entityType: "report_settings", entityId: id, metadata: { name: args.company.companyName } });
    return fields.updatedAt;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireWhitelistedUser(ctx);
    return await ctx.db.query("technicalReports").withIndex("by_updated_at").order("desc").collect();
  },
});

export const getHistory = query({
  args: { reportId: v.id("technicalReports") },
  handler: async (ctx, args) => {
    await requireWhitelistedUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) return null;
    const versions = await ctx.db.query("technicalReportVersions")
      .withIndex("by_report_version", (q) => q.eq("reportId", args.reportId)).order("desc").collect();
    return { report, versions: versions.map((version) => ({
      _id: version._id, version: version.version, status: version.status, createdAt: version.createdAt, title: version.form.title,
    })) };
  },
});

export const getVersion = query({
  args: { versionId: v.id("technicalReportVersions") },
  handler: async (ctx, args) => {
    await requireWhitelistedUser(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;
    const exports = await ctx.db.query("technicalReportExports").withIndex("by_version", (q) => q.eq("versionId", args.versionId)).collect();
    const imageUrls = Object.fromEntries(await Promise.all((version.form.images ?? []).map(async (image) => [image.storageId, await ctx.storage.getUrl(image.storageId)])));
    return { ...version, imageUrls, logoUrl: version.company.logo ? await ctx.storage.getUrl(version.company.logo.storageId) : null, exports: await Promise.all(exports.map(async (file) => ({ ...file, url: await ctx.storage.getUrl(file.storageId) }))) };
  },
});

export const save = mutation({
  args: {
    reportId: v.optional(v.id("technicalReports")),
    expectedVersion: v.number(),
    form: reportFormValidator,
    status: reportStatusValidator,
    company: reportCompanyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const form = normalizeReportForm(args.form, args.company);
    await validateLogo(ctx, args.company.logo);
    if ((form.images?.length ?? 0) > reportImageLimit) throw new ConvexError(`Poți adăuga cel mult ${reportImageLimit} imagini în anexe.`);
    await Promise.all((form.images ?? []).map((image) => validateImage(ctx, image)));
    const issues = reportValidationIssues(form, args.company, args.status);
    if (issues.length) throw new ConvexError(issues.map((issue) => issue.message).join(" "));
    if (JSON.stringify(form).length > 200000 || JSON.stringify(args.company).length > 30000) throw new ConvexError("Raportul este prea mare.");
    if ([form.findings.length, form.work.length, form.materials.length, form.recommendations.length].some((length) => length > 100)) {
      throw new ConvexError("Poți adăuga cel mult 100 de rânduri în fiecare secțiune.");
    }
    if (form.materials.some((material) => !Number.isFinite(material.quantity) || material.quantity <= 0 || !material.name.trim())) {
      throw new ConvexError("Materialele trebuie să aibă denumire și cantitate pozitivă.");
    }
    if (form.recommendations.some((recommendation) => !recommendation.description.trim())) throw new ConvexError("Completează sau elimină recomandările goale.");
    const existing = args.reportId ? await ctx.db.get(args.reportId) : null;
    if (args.reportId && !existing) throw new ConvexError("Raportul nu mai există.");
    if ((existing?.version ?? 0) !== args.expectedVersion) throw new ConvexError("Raportul a fost modificat de alt utilizator. Deschide ultima versiune înainte de a salva.");
    const now = Date.now();
    let number = existing?.number;
    if (!number) {
      const year = form.interventionDate.slice(0, 4);
      const counter = await ctx.db.query("technicalReportCounters").withIndex("by_year", (q) => q.eq("year", year)).unique();
      const value = (counter?.value ?? 0) + 1;
      if (counter) await ctx.db.patch(counter._id, { value });
      else await ctx.db.insert("technicalReportCounters", { year, value });
      const settings = await ctx.db.query("technicalReportSettings").withIndex("by_key", (q) => q.eq("key", "workspace")).unique();
      number = `${(settings?.company ?? defaultReportCompany).reportPrefix}-${year}-${String(value).padStart(4, "0")}`;
    }
    const version = (existing?.version ?? 0) + 1;
    const fields = { number, title: form.title.trim(), beneficiary: form.beneficiary.trim(), interventionDate: form.interventionDate, status: args.status, version, updatedBy: userId, updatedAt: now };
    const reportId = existing?._id ?? await ctx.db.insert("technicalReports", { ...fields, createdBy: userId, createdAt: now });
    if (existing) await ctx.db.patch(existing._id, fields);
    const versionId = await ctx.db.insert("technicalReportVersions", {
      reportId, number, version, status: args.status, form: { ...form, title: fields.title, beneficiary: fields.beneficiary },
      company: args.company, templateVersion: reportTemplate.sourceSha256, createdBy: userId, createdAt: now,
    });
    await logAudit(ctx, { userId, action: existing ? "update" : "create", entityType: "technical_report", entityId: reportId, metadata: { name: `${number} – ${form.title}`, version, status: args.status } });
    return { reportId, versionId, version, number };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireWhitelistedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerLogo = mutation({
  args: { logo: reportLogoValidator },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const { logo } = args;
    const metadata = await ctx.db.system.get(logo.storageId);
    if (!metadata || metadata.contentType !== "image/png" || metadata.size > 2 * 1024 * 1024 || metadata.size === 0) {
      throw new Error("Logo-ul trebuie să fie o imagine PNG de maximum 2 MB.");
    }
    if (!logo.name.trim() || logo.name.length > 200 || !Number.isInteger(logo.width) || !Number.isInteger(logo.height) || logo.width < 1 || logo.height < 1 || logo.width > 1200 || logo.height > 600) {
      throw new Error("Dimensiunile logo-ului nu sunt valide.");
    }
    const existing = await ctx.db.query("technicalReportLogos").withIndex("by_storage", (q) => q.eq("logo.storageId", logo.storageId)).unique();
    if (existing && (existing.uploadedBy !== userId || existing.logo.name !== logo.name || existing.logo.width !== logo.width || existing.logo.height !== logo.height)) throw new Error("Logo-ul nu este valid.");
    if (!existing) await ctx.db.insert("technicalReportLogos", { logo, uploadedBy: userId, createdAt: Date.now() });
    return { logo, url: await ctx.storage.getUrl(logo.storageId) };
  },
});

export const attachExport = mutation({
  args: { versionId: v.id("technicalReportVersions"), format: reportFormatValidator, storageId: v.id("_storage"), rendererVersion: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    if (args.rendererVersion !== undefined && !/^[A-Za-z0-9._-]{1,80}$/.test(args.rendererVersion)) throw new ConvexError("Versiunea formatului de export nu este validă.");
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new ConvexError("Versiunea raportului nu există.");
    const metadata = await ctx.db.system.get(args.storageId);
    const contentType = args.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!metadata || metadata.contentType !== contentType || metadata.size > 15000000) throw new ConvexError("Fișierul exportat nu este valid.");
    const existing = await ctx.db.query("technicalReportExports").withIndex("by_version", (q) => q.eq("versionId", args.versionId)).collect();
    const previous = existing.find((file) => file.format === args.format && file.rendererVersion === args.rendererVersion);
    // Concurrent exports keep the first archived file for this immutable revision.
    if (previous) {
      return await ctx.storage.getUrl(previous.storageId);
    }
    const name = reportFilename(version, args.format);
    await ctx.db.insert("technicalReportExports", { ...args, name, createdBy: userId, createdAt: Date.now() });
    await logAudit(ctx, { userId, action: "export", entityType: "technical_report", entityId: version.reportId, metadata: { name, version: version.version } });
    return await ctx.storage.getUrl(args.storageId);
  },
});
