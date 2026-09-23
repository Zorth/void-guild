import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

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

/**
 * Check for Black Void auction house items closing in under 1 hour
 * and send a warning alert to #black-void.
 */
crons.interval(
  "notify closing soon black void listings",
  { minutes: 5 },
  internal.blackVoidDiscord.checkClosingSoonListings
);

export default crons;
