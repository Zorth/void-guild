import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/api/interactions']);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return; // Completely bypass Clerk for Discord
  }
});

export const config = {
  matcher: [
    // Standard Next.js matcher - handle exclusions inside the function
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
