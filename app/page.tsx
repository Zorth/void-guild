'use client'

import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import Characters from '@/components/characters/Characters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy } from 'lucide-react'

export default function Home() {
  const HomeSkeleton = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-40 grayscale pointer-events-none select-none">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Characters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Your World</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-9 w-20" />
                </div>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Guild of The Void</h1>
          <p className="text-sm text-muted-foreground mt-1">Management tool for The Void Campaign, currently in Open Beta.</p>
        </div>
        <Authenticated>
          <div className="flex items-center gap-2">
            <Link href="/stats">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Stats
              </Button>
            </Link>
            <UserButton />
          </div>
        </Authenticated>
        <AuthLoading>
            <Skeleton className="h-8 w-8 rounded-full" />
        </AuthLoading>
        <Unauthenticated>
          <SignInButton />
        </Unauthenticated>
      </div>

      <AuthLoading>
        {HomeSkeleton}
      </AuthLoading>

      <Authenticated>
        <Characters />
      </Authenticated>

      <Unauthenticated>
        {HomeSkeleton}
        <div className="mt-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Guild of the Void</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Manage your characters, join epic sessions, and track your progress in the void.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
              Get Started
            </Button>
          </SignInButton>
        </div>
      </Unauthenticated>
    </main>
  )
}
