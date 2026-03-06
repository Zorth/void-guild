import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;

