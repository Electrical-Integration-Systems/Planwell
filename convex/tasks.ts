import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    let tasks = await ctx.db.query("tasks").collect();

    // Filter: OR within category, AND between categories
    const hasProjectFilter = args.projectIds && args.projectIds.length > 0;
    const hasExcludeProjectFilter =
      args.excludeProjectIds && args.excludeProjectIds.length > 0;
    if (hasProjectFilter) {
      tasks = tasks.filter((t) => t.projectId !== undefined && args.projectIds!.includes(t.projectId));
    }
    if (hasExcludeProjectFilter) {
      tasks = tasks.filter(
        (t) => t.projectId === undefined || !args.excludeProjectIds!.includes(t.projectId),
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

    return tasks.map((task) => ({
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
    }));
  },
});

export const get = query({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      stateId: args.stateId,
      priorityId: args.priorityId,
      projectId: args.projectId,
      assignees: args.assignees,
      tagIds: args.tagIds,
      creatorId: userId,
      createdAt: now,
      updatedAt: now,
    });
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    // Delete all task updates for this task
    const updates = await ctx.db
      .query("taskUpdates")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();
    for (const update of updates) {
      await ctx.db.delete(update._id);
    }
    await ctx.db.delete(args.id);
  },
});
