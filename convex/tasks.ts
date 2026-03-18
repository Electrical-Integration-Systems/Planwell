import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { logAudit } from "./auditLog";
import { getWhitelistedUserId, requireWhitelistedUser } from "./authz";

export const list = query({
  args: {
    archived: v.optional(v.boolean()),
    projectIds: v.optional(v.array(v.id("projects"))),
    excludeProjectIds: v.optional(v.array(v.id("projects"))),
    stateIds: v.optional(v.array(v.id("taskStates"))),
    excludeStateIds: v.optional(v.array(v.id("taskStates"))),
    priorityIds: v.optional(v.array(v.id("priorities"))),
    excludePriorityIds: v.optional(v.array(v.id("priorities"))),
    assigneeIds: v.optional(v.array(v.id("users"))),
    excludeAssigneeIds: v.optional(v.array(v.id("users"))),
    tagIds: v.optional(v.array(v.id("tags"))),
    excludeTagIds: v.optional(v.array(v.id("tags"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return { tasks: [], nextCursor: null, totalCount: 0 };

    let tasks = await ctx.db.query("tasks").collect();

    // Filter by archived status (default: non-archived)
    const showArchived = args.archived ?? false;
    tasks = tasks.filter((t) => (t.archived ?? false) === showArchived);

    // Filter: OR within category, AND between categories
    const hasProjectFilter = args.projectIds && args.projectIds.length > 0;
    const hasExcludeProjectFilter =
      args.excludeProjectIds && args.excludeProjectIds.length > 0;
    if (hasProjectFilter) {
      tasks = tasks.filter((t) => t.projectId && args.projectIds!.includes(t.projectId));
    }
    if (hasExcludeProjectFilter) {
      tasks = tasks.filter(
        (t) => !t.projectId || !args.excludeProjectIds!.includes(t.projectId),
      );
    }

    const hasStateFilter = args.stateIds && args.stateIds.length > 0;
    const hasExcludeStateFilter =
      args.excludeStateIds && args.excludeStateIds.length > 0;
    if (hasStateFilter) {
      tasks = tasks.filter((t) => args.stateIds!.includes(t.stateId));
    }
    if (hasExcludeStateFilter) {
      tasks = tasks.filter((t) => !args.excludeStateIds!.includes(t.stateId));
    }

    const hasPriorityFilter = args.priorityIds && args.priorityIds.length > 0;
    const hasExcludePriorityFilter =
      args.excludePriorityIds && args.excludePriorityIds.length > 0;
    if (hasPriorityFilter) {
      tasks = tasks.filter((t) => args.priorityIds!.includes(t.priorityId));
    }
    if (hasExcludePriorityFilter) {
      tasks = tasks.filter(
        (t) => !args.excludePriorityIds!.includes(t.priorityId),
      );
    }

    const hasAssigneeFilter = args.assigneeIds && args.assigneeIds.length > 0;
    const hasExcludeAssigneeFilter =
      args.excludeAssigneeIds && args.excludeAssigneeIds.length > 0;
    if (hasAssigneeFilter) {
      tasks = tasks.filter((t) =>
        t.assignees.some((a) => args.assigneeIds!.includes(a)),
      );
    }
    if (hasExcludeAssigneeFilter) {
      tasks = tasks.filter(
        (t) => !t.assignees.some((a) => args.excludeAssigneeIds!.includes(a)),
      );
    }

    const hasTagFilter = args.tagIds && args.tagIds.length > 0;
    const hasExcludeTagFilter =
      args.excludeTagIds && args.excludeTagIds.length > 0;
    if (hasTagFilter) {
      tasks = tasks.filter((t) =>
        t.tagIds.some((tag) => args.tagIds!.includes(tag)),
      );
    }
    if (hasExcludeTagFilter) {
      tasks = tasks.filter(
        (t) => !t.tagIds.some((tag) => args.excludeTagIds!.includes(tag)),
      );
    }

    // Total count for UI
    const totalCount = tasks.length;

    // Pagination: limit-based (frontend increases limit for infinite scroll)
    const limit = args.limit ?? 50;
    // Sort by createdAt desc for consistent ordering
    tasks.sort((a, b) => b.createdAt - a.createdAt);
    const page = tasks.slice(0, limit);

    // Denormalize: fetch related data
    const [states, priorities, projects, allUsers, tags] = await Promise.all([
      ctx.db.query("taskStates").collect(),
      ctx.db.query("priorities").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("tags").collect(),
    ]);

    const stateMap = new Map(states.map((s) => [s._id, s]));
    const priorityMap = new Map(priorities.map((p) => [p._id, p]));
    const projectMap = new Map(projects.map((p) => [p._id, p]));
    const userMap = new Map(allUsers.map((u) => [u._id, u]));
    const tagMap = new Map(tags.map((t) => [t._id, t]));

    return {
      tasks: page.map((task) => ({
        ...task,
        state: stateMap.get(task.stateId) ?? null,
        priority: priorityMap.get(task.priorityId) ?? null,
        project: task.projectId ? projectMap.get(task.projectId) ?? null : null,
        assigneeUsers: task.assignees
          .map((id) => userMap.get(id))
          .filter((u) => u !== undefined),
        tagList: task.tagIds
          .map((id) => tagMap.get(id))
          .filter((t) => t !== undefined),
      })),
      totalCount,
    };
  },
});

export const get = query({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getWhitelistedUserId(ctx);
    if (userId === null) return null;
    const task = await ctx.db.get(args.id);
    if (task === null) return null;

    const [state, priority, project, tags] = await Promise.all([
      ctx.db.get(task.stateId),
      ctx.db.get(task.priorityId),
      task.projectId ? ctx.db.get(task.projectId) : Promise.resolve(null),
      Promise.all(task.tagIds.map((id) => ctx.db.get(id))),
    ]);

    const assigneeUsers = await Promise.all(
      task.assignees.map((id) => ctx.db.get(id)),
    );

    return {
      ...task,
      state,
      priority,
      project,
      assigneeUsers: assigneeUsers.filter((u) => u !== null),
      tagList: tags.filter((t) => t !== null),
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    stateId: v.id("taskStates"),
    priorityId: v.id("priorities"),
    projectId: v.optional(v.id("projects")),
    assignees: v.array(v.id("users")),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      stateId: args.stateId,
      priorityId: args.priorityId,
      projectId: args.projectId,
      assignees: args.assignees,
      tagIds: args.tagIds,
      creatorId: userId,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(ctx, {
      userId,
      action: "create",
      entityType: "task",
      entityId: taskId,
      metadata: { name: args.title },
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    stateId: v.optional(v.id("taskStates")),
    priorityId: v.optional(v.id("priorities")),
    projectId: v.optional(v.id("projects")),
    assignees: v.optional(v.array(v.id("users"))),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    await requireWhitelistedUser(ctx);
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);
  },
});

export const archive = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const task = await ctx.db.get(args.id);
    if (task === null) throw new Error("Task not found");
    const now = Date.now();
    await ctx.db.patch(args.id, { archived: true, archivedAt: now, updatedAt: now });

    await logAudit(ctx, {
      userId,
      action: "archive",
      entityType: "task",
      entityId: args.id,
      metadata: { name: task.title },
    });
  },
});

export const unarchive = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    const task = await ctx.db.get(args.id);
    if (task === null) throw new Error("Task not found");
    const now = Date.now();
    await ctx.db.patch(args.id, { archived: false, archivedAt: undefined, updatedAt: now });

    await logAudit(ctx, {
      userId,
      action: "unarchive",
      entityType: "task",
      entityId: args.id,
      metadata: { name: task.title },
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireWhitelistedUser(ctx);
    // Delete all task updates for this task
    const updates = await ctx.db
      .query("taskUpdates")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();
    for (const update of updates) {
      await ctx.db.delete(update._id);
    }

    const task = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    if (task) {
      await logAudit(ctx, {
        userId,
        action: "delete",
        entityType: "task",
        entityId: args.id,
        metadata: { name: task.title },
      });
    }
  },
});

// Internal mutation for auto-archiving (called by cron)
export const autoArchiveDone = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Find all "Done" states
    const states = await ctx.db.query("taskStates").collect();
    const doneStates = states.filter((s) => s.name.toLowerCase() === "done");
    if (doneStates.length === 0) return 0;

    const doneStateIds = new Set(doneStates.map((s) => s._id));

    // Find all non-archived tasks in Done state updated more than 1 week ago
    const allTasks = await ctx.db.query("tasks").collect();
    const toArchive = allTasks.filter(
      (t) =>
        !t.archived &&
        doneStateIds.has(t.stateId) &&
        t.updatedAt <= oneWeekAgo,
    );

    const now = Date.now();
    for (const task of toArchive) {
      await ctx.db.patch(task._id, { archived: true, archivedAt: now, updatedAt: now });
    }

    return toArchive.length;
  },
});
