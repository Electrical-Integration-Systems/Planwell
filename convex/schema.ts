import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

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
});
