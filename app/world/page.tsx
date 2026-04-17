'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, Globe, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'
import { UserMetadata } from '@/app/stats/actions'

export default function WorldsListPage() {
  const worlds = useQuery(api.worlds.listAllWorlds)

  const ownerIds = useMemo(() => {
    if (!worlds) return [];
    return Array.from(new Set(worlds.map((w) => w.owner)));
  }, [worlds]);

  const usersMetadataRaw = useQuery(api.users.getUsersByIds, { userIds: ownerIds });

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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </Button>
        <h1 className="text-4xl font-bold flex-grow text-center pr-20">All Worlds</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {worlds === undefined ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : worlds.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground italic py-12">
            No worlds have been discovered yet...
          </p>
        ) : (
          worlds.map((world) => {
            const ownerName = userMetadata[world.owner]?.name || `User ${world.owner.slice(-4)}`
            return (
              <Link key={world._id} href={`/world/${encodeURIComponent(world.name)}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {world.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Owned by <span className="font-medium text-foreground">{ownerName}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-200" />
                  </CardHeader>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
