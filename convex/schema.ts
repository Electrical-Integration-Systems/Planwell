import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { reportCompanyValidator, reportFormValidator, reportStatusValidator, reportFormatValidator, reportLogoValidator } from "./reportValidators";

export default defineSchema({
  ...authTables,

  technicalReportSettings: defineTable({
    key: v.string(),
    company: reportCompanyValidator,
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  technicalReportCounters: defineTable({
    year: v.string(),
    value: v.number(),
  }).index("by_year", ["year"]),

  technicalReportLogos: defineTable({
    logo: reportLogoValidator,
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_storage", ["logo.storageId"]),

  technicalReports: defineTable({
    number: v.string(),
    title: v.string(),
    beneficiary: v.string(),
    interventionDate: v.string(),
    status: reportStatusValidator,
    version: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updated_at", ["updatedAt"]),

  technicalReportVersions: defineTable({
    reportId: v.id("technicalReports"),
    number: v.string(),
    version: v.number(),
    status: reportStatusValidator,
    form: reportFormValidator,
    company: reportCompanyValidator,
    templateVersion: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_report_version", ["reportId", "version"]),

  technicalReportExports: defineTable({
    versionId: v.id("technicalReportVersions"),
    format: reportFormatValidator,
    rendererVersion: v.optional(v.string()),
    storageId: v.id("_storage"),
    name: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_version", ["versionId"]),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    bannerPhotoId: v.optional(v.id("files")),
    archived: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  projectDevices: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  projectCredentials: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    type: v.string(),
    username: v.optional(v.string()),
    secret: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  credentialShares: defineTable({
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    mode: v.union(v.literal("timed"), v.literal("one_time")),
    tokenHash: v.string(),
    pinHash: v.string(),
    pinSalt: v.string(),
    credentialCount: v.number(),
    expiresAt: v.optional(v.number()),
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    failedAttempts: v.number(),
    failureWindowStartedAt: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    lastAccessedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_project", ["projectId"])
    .index("by_expires_at", ["expiresAt"]),

  credentialShareItems: defineTable({
    shareId: v.id("credentialShares"),
    sourceCredentialId: v.id("projectCredentials"),
    order: v.number(),
    name: v.string(),
    type: v.string(),
    username: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    secret: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_share", ["shareId"]),

  taskStates: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_order", ["order"]),

  priorities: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_order", ["order"]),

  tags: defineTable({
    name: v.string(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    stateId: v.id("taskStates"),
    priorityId: v.id("priorities"),
    projectId: v.optional(v.id("projects")),
    assignees: v.array(v.id("users")),
    tagIds: v.array(v.id("tags")),
    creatorId: v.id("users"),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_state", ["stateId"])
    .index("by_priority", ["priorityId"])
    .index("by_archived", ["archived"]),

  taskUpdates: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  projectUpdates: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  filterPresets: defineTable({
    name: v.string(),
    filters: v.string(),
    sortKeys: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.string()),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"]),

  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    type: v.string(),
    kind: v.optional(v.union(v.literal("file"), v.literal("photo"))),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_project", ["projectId"])
    .index("by_task", ["taskId"])
    .index("by_kind", ["kind"]),
});
