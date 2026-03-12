'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

export default function SessionClosedListener() {
  const sessions = useQuery(api.sessions.listUserJoinedSessions)
  const prevLockedRef = useRef<Record<Id<'sessions'>, boolean>>({})

  useEffect(() => {
    if (!sessions) return

    const newLocked: Record<Id<'sessions'>, boolean> = {}
    sessions.forEach((session) => {
      const wasLocked = prevLockedRef.current[session._id]
      if (wasLocked === false && session.locked === true) {
        // Session was unlocked and is now locked (closed)
        toast("The session is over!", {
          description: "Don't forget to tip your voidmaster if you can ;)",
          duration: 10000,
          icon: '💎'
        })
      }
      newLocked[session._id] = session.locked
    })

    prevLockedRef.current = newLocked
  }, [sessions])

  return null
}
