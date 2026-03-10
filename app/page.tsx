'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import Characters from './characters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Guild of The Void</h1>
        <Authenticated>
          <div className="flex items-center gap-2">
            <Link href="/stats">
              <Button variant="ghost">Stats</Button>
            </Link>
            <UserButton />
          </div>
        </Authenticated>
        <Unauthenticated>
          <SignInButton />
        </Unauthenticated>
      </div>

      <Authenticated>
        <Characters />
      </Authenticated>

      <Unauthenticated>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Welcome to the Guild of the Void!</h2>
          <p className="text-lg text-muted-foreground">
            Please sign in to manage your characters.
          </p>
        </div>
      </Unauthenticated>
    </main>
  )
}
