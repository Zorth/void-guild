import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/api/interactions']);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    console.log(`[Middleware] Skipping Clerk for: ${request.nextUrl.pathname}`);
    return; 
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
