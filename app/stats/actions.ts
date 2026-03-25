'use server'

import { createClerkClient } from '@clerk/backend';

export interface UserMetadata {
  name: string;
  imageUrl?: string;
  extraSessionsPlayed?: number;
  extraSessionsRan?: number;
}

export async function getUsernames(userIds: string[]): Promise<Record<string, UserMetadata>> {
  
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not set. Server-side Clerk features will not work.");
      const fallbackMap: Record<string, UserMetadata> = {};
      userIds.forEach(id => {
        fallbackMap[id] = { name: `Server Error: Missing Clerk Secret Key` };
      });
      return fallbackMap;
  }

  try {
    const clerk = createClerkClient({ secretKey }); 
    const users = await clerk.users.getUserList({ 
      userId: userIds,
      limit: 500 // Increased from default 10 to fetch all requested users
    });
    
    const usernameMap: Record<string, UserMetadata> = {};
    users.data.forEach(user => {

      let displayName = "";
      
      if (user.firstName) {
        displayName = user.firstName;
        if (user.lastName) {
          displayName += ` ${user.lastName.charAt(0).toUpperCase()}.`;
        }
      } else if (user.username) {
        displayName = user.username;
      } else if (user.emailAddresses.length > 0) {
        displayName = user.emailAddresses[0].emailAddress.split('@')[0];
      }
      
      usernameMap[user.id] = {
        name: displayName || `User ${user.id.slice(-4)}`,
        imageUrl: user.imageUrl,
        extraSessionsPlayed: user.publicMetadata.extraSessionsPlayed as number | undefined,
        extraSessionsRan: user.publicMetadata.extraSessionsRan as number | undefined,
      };
    });

    return usernameMap;
  } catch (error) {
    console.error('Error fetching usernames from Clerk:', error);
    const fallbackMap: Record<string, UserMetadata> = {};
    userIds.forEach(id => {
      fallbackMap[id] = { name: `User ${id.slice(-4)}` };
    });
    return fallbackMap;
  }
}
