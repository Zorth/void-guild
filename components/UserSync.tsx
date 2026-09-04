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
      const doSync = async () => {
        try {
          // Force Clerk SDK to refresh external accounts from Clerk backend
          if (typeof user.reload === 'function') {
            await user.reload()
          }
        } catch (e) {
          // Ignore reload network errors
        }

        const discordAccount = user.externalAccounts?.find((acc) => {
          const providerStr = String(acc.provider || '').toLowerCase()
          const strategyStr = String((acc as any)?.verification?.strategy || '').toLowerCase()
          return providerStr.includes('discord') || strategyStr.includes('discord')
        })

        const discordId =
          (discordAccount as any)?.providerUserId ||
          (discordAccount as any)?.externalId ||
          (discordAccount as any)?.provider_user_id ||
          discordAccount?.id

        const discordUsername =
          discordAccount?.username ||
          (discordAccount as any)?.emailAddress ||
          (discordAccount as any)?.label

        await syncUser({
          discordId: discordId ? String(discordId) : undefined,
          discordUsername: discordUsername ? String(discordUsername) : undefined,
        })
      }

      doSync().catch(console.error)
    }
  }, [isLoaded, isSignedIn, user, syncUser])

  return null
}
