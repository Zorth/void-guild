'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Trophy } from 'lucide-react'

const STORAGE_KEY = 'void_notified_achievements'

function getNotifiedAchievements(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    return item ? new Set(JSON.parse(item)) : new Set()
  } catch {
    return new Set()
  }
}

function saveNotifiedAchievements(notified: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(notified)))
  } catch (err) {
    console.error('Failed to save notified achievements to localStorage:', err)
  }
}

function fireAchievementConfetti() {
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.65 },
    colors: ['#7E22CE', '#9333EA', '#C084FC', '#E9D5FF', '#FFFFFF'],
  })
}

const ACHIEVEMENT_CHECK_INTERVAL_MS = 10 * 60 * 1000 // Throttle check to at most once per 10 minutes per session

export default function AchievementListener() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)
  const markAchievementsNotified = useMutation(api.achievements.markAchievementsNotified)
  const isCheckingRef = useRef(false)
  const notifiedInSessionRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    const storageKey = 'void_last_achievement_check'

    const checkAndNotify = async (force: boolean = false) => {
      if (isCheckingRef.current) return
      if (!force) {
        const lastCheck = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null
        const now = Date.now()
        if (lastCheck && now - Number(lastCheck) < ACHIEVEMENT_CHECK_INTERVAL_MS) {
          return // Skip check: already checked within cooldown window
        }
      }

      isCheckingRef.current = true
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, String(Date.now()))
        }
        const res = await syncAndGetAchievements()
        if (!res?.achievements) return

        // Unnotified unlocked achievements that haven't been toasted in this browser session
        const unnotifiedUnlocked = res.achievements.filter(
          (a) => a.isUnlocked && !a.isNotified && !notifiedInSessionRef.current.has(a.id)
        )

        if (unnotifiedUnlocked.length > 0) {
          const idsToMark: string[] = []

          unnotifiedUnlocked.forEach((achievement, index) => {
            notifiedInSessionRef.current.add(achievement.id)
            idsToMark.push(achievement.id)

            setTimeout(() => {
              toast(
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Achievement Unlocked!
                  </span>
                  <span className="font-bold text-sm text-purple-100">{achievement.title}</span>
                </div>,
                {
                  description: achievement.description,
                  icon: <Trophy className="h-5 w-5 text-purple-400 shrink-0" />,
                  style: {
                    backgroundColor: '#1e1b4b',
                    borderColor: 'rgba(147, 51, 234, 0.5)',
                    color: '#f8fafc',
                  },
                  className:
                    '!bg-purple-950 !border-purple-500/50 !text-slate-100 font-sans shadow-2xl backdrop-blur-md rounded-xl p-4',
                  descriptionClassName: '!text-purple-200/90 !text-xs mt-1',
                  duration: 6000,
                }
              )
              fireAchievementConfetti()
            }, index * 800)
          })

          // Mark as notified in Convex DB so secondary devices won't re-toast
          markAchievementsNotified({ achievementIds: idsToMark }).catch(console.error)
        }
      } catch (err) {
        console.error('Failed to check achievement notifications:', err)
      } finally {
        isCheckingRef.current = false
      }
    }

    checkAndNotify(false)

    const handleTrigger = () => {
      checkAndNotify(true)
    }
    window.addEventListener('void-achievement-action', handleTrigger)
    return () => {
      window.removeEventListener('void-achievement-action', handleTrigger)
    }
  }, [isAuthenticated, isLoading, syncAndGetAchievements, markAchievementsNotified])

  return null
}
