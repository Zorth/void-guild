import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextFetchEvent } from 'next/server';

const clerkProxy = clerkMiddleware();

export default function proxy(req: NextRequest, evt: NextFetchEvent) {
  return clerkProxy(req, evt);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!api/interactions|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (except interactions)
    '/(api(?!/interactions)|trpc)(.*)',
  ],
};

