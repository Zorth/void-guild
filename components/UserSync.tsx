'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * Background component that syncs Clerk user metadata (roles, Discord connection, extra sessions) to the Convex database.
 * This ensures that user data is persisted and kept up to date.
 */
const SYNC_INTERVAL_MS = 5 * 60 * 1000 // Throttle sync to at most once per 5 minutes per session

export default function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const syncUser = useMutation(api.users.syncUser)
  const lastReloadRef = useRef<number>(0)

  // Listen for window focus or tab visibility changes to instantly reload Clerk user metadata
  // (e.g., if a user purchased a membership on tarragon.be in another tab and returned).
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const triggerReload = () => {
      const now = Date.now()
      if (now - lastReloadRef.current < 3000) return
      lastReloadRef.current = now
      user.reload().catch(console.error)
    }

    const handleFocus = () => {
      triggerReload()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerReload()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoaded, isSignedIn, user])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const memberStatus = String(user.publicMetadata?.isMember)
    const roleStatus = String(user.publicMetadata?.role || '')
    const adminStatus = String(user.publicMetadata?.admin || '')
    const gmStatus = String(user.publicMetadata?.gamemaster || '')
    const key = `void_user_synced_${user.id}_${memberStatus}_${roleStatus}_${adminStatus}_${gmStatus}`
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

      const isMember = Boolean(
        user.publicMetadata?.isMember === true ||
        String(user.publicMetadata?.isMember).toLowerCase() === 'true' ||
        user.publicMetadata?.role === 'member' ||
        user.publicMetadata?.role === 'dragon' ||
        user.publicMetadata?.role === 'admin'
      )
      const isAdmin = Boolean(
        user.publicMetadata?.admin === true ||
        String(user.publicMetadata?.admin).toLowerCase() === 'true' ||
        user.publicMetadata?.role === 'admin'
      )
      const isGMExplicitlyFalse =
        user.publicMetadata?.gamemaster === false ||
        String(user.publicMetadata?.gamemaster).toLowerCase() === 'false'
      const isGM = !isGMExplicitlyFalse && Boolean(
        user.publicMetadata?.gamemaster === true ||
        String(user.publicMetadata?.gamemaster).toLowerCase() === 'true' ||
        user.publicMetadata?.role === 'gamemaster' ||
        user.publicMetadata?.role === 'voidmaster' ||
        isAdmin
      )
      const role = String(user.publicMetadata?.role || '')

      await syncUser({
        discordId: discordId ? String(discordId) : undefined,
        discordUsername: discordUsername ? String(discordUsername) : undefined,
        isMember,
        isAdmin,
        isGM,
        role: role || undefined,
      })

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, String(Date.now()))
      }
    }

    doSync().catch(console.error)
  }, [
    isLoaded,
    isSignedIn,
    user?.id,
    user?.publicMetadata?.isMember,
    user?.publicMetadata?.role,
    user?.publicMetadata?.admin,
    user?.publicMetadata?.gamemaster,
    syncUser,
  ])

  return null
}
