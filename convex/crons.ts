import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily cleanup of past availability data.
 * This runs at 00:00 every day.
 */
crons.daily(
  "delete past availability",
  { hourUTC: 0, minuteUTC: 0 },
  api.planning.cleanupOldAvailability
);

export default crons;
