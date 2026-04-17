'use server'

export interface UserMetadata {
  name: string;
  imageUrl?: string;
  extraSessionsPlayed?: number;
  extraSessionsRan?: number;
}
