'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Background component that syncs Clerk user metadata (roles, extra sessions) to the Convex database.
 * This ensures that user data is persisted and kept up to date.
 */
export default function UserSync() {
  const { userId, isSignedIn } = useAuth()
  const syncUser = useMutation(api.users.syncUser)

  useEffect(() => {
    if (isSignedIn && userId) {
      // Sync basic info via mutation (fast, uses JWT)
      syncUser().catch(console.error)
    }
  }, [isSignedIn, userId, syncUser])

  return null
}
