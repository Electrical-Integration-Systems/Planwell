import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Auto-archive tasks in "Done" state for more than a week
// Runs daily at midnight UTC
crons.daily(
  "auto-archive-done-tasks",
  { hourUTC: 0, minuteUTC: 0 },
  internal.tasks.autoArchiveDone,
);

export default crons;
