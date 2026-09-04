'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * Background component that syncs Clerk user metadata (roles, Discord connection, extra sessions) to the Convex database.
 * This ensures that user data is persisted and kept up to date.
 */
export default function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const syncUser = useMutation(api.users.syncUser)

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const discordAccount = user.externalAccounts?.find((acc) => {
        const providerStr = String(acc.provider || '').toLowerCase()
        return providerStr.includes('discord')
      })

      const discordId =
        (discordAccount as any)?.providerUserId ||
        (discordAccount as any)?.externalId ||
        discordAccount?.id

      const discordUsername =
        discordAccount?.username ||
        (discordAccount as any)?.emailAddress ||
        (discordAccount as any)?.label

      syncUser({
        discordId: discordId ? String(discordId) : undefined,
        discordUsername: discordUsername ? String(discordUsername) : undefined,
      }).catch(console.error)
    }
  }, [isLoaded, isSignedIn, user, user?.externalAccounts, syncUser])

  return null
}
