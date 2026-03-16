import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // 1. Exclude interactions and static files
    '/((?!api/interactions|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 2. Protect other API routes
    '/api/(?!interactions)(.*)',
    '/trpc/(.*)',
  ],
};
