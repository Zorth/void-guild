'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Background component that syncs Clerk user metadata (roles) to the Convex database.
 * This ensures that admin/gamemaster permissions are persisted even if JWT claims fail.
 */
export default function UserSync() {
  const { userId, isSignedIn } = useAuth()
  const syncUser = useMutation(api.users.syncUser)

  useEffect(() => {
    if (isSignedIn && userId) {
      syncUser().catch(console.error)
    }
  }, [isSignedIn, userId, syncUser])

  return null
}
