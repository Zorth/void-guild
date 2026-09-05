'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * Background component that syncs Clerk user metadata (roles, Discord connection, extra sessions) to the Convex database.
 * This ensures that user data is persisted and kept up to date.
 */
const SYNC_INTERVAL_MS = 5 * 60 * 1000 // Throttle sync to at most once per 5 minutes per session

export default function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const syncUser = useMutation(api.users.syncUser)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const key = `void_user_synced_${user.id}`
    const lastSynced = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null
    const now = Date.now()

    if (lastSynced && now - Number(lastSynced) < SYNC_INTERVAL_MS) {
      return // Skip duplicate sync in this session
    }

    const doSync = async () => {
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

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, String(Date.now()))
      }
    }

    doSync().catch(console.error)
  }, [isLoaded, isSignedIn, user?.id, syncUser])

  return null
}
