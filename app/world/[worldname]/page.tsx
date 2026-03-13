'use client'

import { useParams, notFound } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, Globe, Calendar, Book } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatTime, getLevelBadgeStyle } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { getUsernames, UserMetadata } from '@/app/stats/actions'

export default function WorldPage() {
  const params = useParams()
  const worldName = decodeURIComponent(params.worldname as string)
  
  const world = useQuery(api.worlds.getWorldByName, { name: worldName })
  const sessions = useQuery(api.worlds.getSessionsByWorld, world?._id ? { worldId: world._id } : 'skip')
  
  const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({})

  useEffect(() => {
    if (world) {
      getUsernames([world.owner]).then(setUserMetadata)
    }
  }, [world])

  if (world === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (world === null) {
    notFound()
    return null
  }

  const ownerMetadata = userMetadata[world.owner]
  const ownerName = ownerMetadata?.name || `User ${world.owner.slice(-4)}`

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <Globe className="h-8 w-8 text-primary" />
                  {world.name}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Owned by <span className="font-semibold text-foreground">{ownerName}</span>
                </p>
              </div>
              {world.link && (
                <Button variant="outline" asChild>
                  <a href={world.link} target="_blank" rel="noopener noreferrer">
                    <Book className="h-4 w-4 mr-2" />
                    Wiki
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sessions in this World
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions === undefined ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground italic">No sessions found for this world.</p>
            ) : (
              <ul className="space-y-4">
                {sessions.map((session) => (
                  <li key={session._id} className="border-b pb-4 last:border-0">
                    <Link
                      href={`/sessions/${session._id}`}
                      className="block hover:bg-muted/50 p-2 rounded-md transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={getLevelBadgeStyle(session.level)}
                            >
                                Lvl {session.level ?? 'TBD'}
                            </span>
                            {session.system && (
                                <img 
                                    src={session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                    alt={session.system} 
                                    className="h-4 w-4"
                                />
                            )}
                            <span className="font-medium">
                                {formatDate(session.date)} at {formatTime(session.date)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.characters.length} / {session.maxPlayers} players
                            {session.locked && <span className="ml-2 text-amber-600 font-medium">(Locked)</span>}
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
