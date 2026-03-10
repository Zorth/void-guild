'use server'

import { createClerkClient } from '@clerk/backend';

export async function getUsernames(userIds: string[]): Promise<Record<string, string>> {
  
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not set. Server-side Clerk features will not work.");
      const fallbackMap: Record<string, string> = {};
      userIds.forEach(id => {
        fallbackMap[id] = `Server Error: Missing Clerk Secret Key`;
      });
      return fallbackMap;
  }

  try {
    const clerk = createClerkClient({ secretKey }); 
    const users = await clerk.users.getUserList({ userId: userIds });
    
    const usernameMap: Record<string, string> = {};
    users.data.forEach(user => {

      let displayName = user.username;
      if (!displayName && user.firstName) {
        displayName = user.firstName;
        if (user.lastName) {
          displayName += ` ${user.lastName}`;
        }
      }
      if (!displayName && user.emailAddresses.length > 0) {
        displayName = user.emailAddresses[0].emailAddress.split('@')[0];
      }
      
      usernameMap[user.id] = displayName || `User ${user.id.slice(-4)}`;
    });

    return usernameMap;
  } catch (error) {
    console.error('Error fetching usernames from Clerk:', error);
    const fallbackMap: Record<string, string> = {};
    userIds.forEach(id => {
      fallbackMap[id] = `User ${id.slice(-4)}`;
    });
    return fallbackMap;
  }
}
