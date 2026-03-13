import { httpRouter } from "convex/server";
import { syncSessionToDiscord } from "./discord";

const http = httpRouter();

// You can also handle interactions directly in Convex if preferred, 
// but since we already have a Next.js API route setup, we can use that.
// If you want Convex to handle it, we would add a route here.

export default http;
