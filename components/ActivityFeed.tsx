'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime } from '@/lib/utils'
import { Sparkles, Trophy, User } from 'lucide-react'
import { useMemo } from 'react'
import { UserMetadata } from '@/app/stats/actions'

export default function ActivityFeed() {
  const activities = useQuery(api.activity.listActivity)

  const userIds = useMemo(() => {
    if (!activities) return [];
    return Array.from(new Set(activities.map(a => a.userId).filter((id): id is string => !!id)));
  }, [activities]);

  const usersMetadataRaw = useQuery(api.users.getUsersByIds, { userIds });

  const userMetadata = useMemo(() => {
    if (!usersMetadataRaw) return {};
    const map: Record<string, UserMetadata> = {};
    usersMetadataRaw.forEach(user => {
        map[user.userId] = {
            name: user.name || user.username || `User ${user.userId.slice(-4)}`,
            imageUrl: user.imageUrl,
            extraSessionsPlayed: user.extraSessionsPlayed,
            extraSessionsRan: user.extraSessionsRan,
        };
    });
    return map;
  }, [usersMetadataRaw]);

  if (activities === undefined) {
    return (
      <div className="mt-12 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <div className="mt-16 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-muted-foreground">
        <Sparkles className="h-5 w-5" /> Global Activity
      </h2>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground italic border-l-2 pl-4">No recent activity in the Void... yet.</p>
      ) : (
        <ul className="space-y-6">
          {activities.map((activity, index) => {
            // Calculate opacity: 1st is 1, 7th is ~0.05
            const opacity = 1 - (index * 0.15)
            
            const message = activity.userId 
                ? activity.message.replace('{user}', userMetadata[activity.userId]?.name || `User ${activity.userId.slice(-4)}`)
                : activity.message

            return (
              <li 
                key={activity._id} 
                className="flex items-start gap-4 transition-all"
                style={{ opacity }}
              >
                <div className="mt-1">
                  {activity.type === 'level_up' && <Sparkles className="h-5 w-5 text-purple-500" />}
                  {activity.type === 'rank_promotion' && <Trophy className="h-5 w-5 text-amber-500" />}
                  {activity.type === 'character_created' && <User className="h-5 w-5 text-green-500" />}
                </div>
                <div className="flex-grow">
                  <p className="text-md font-medium">{message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(activity._creationTime)} at {formatTime(activity._creationTime)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
