'use client'

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton, UserButton } from '@clerk/nextjs'
import Characters from '@/components/characters/Characters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Book, Globe } from 'lucide-react'
import ActivityFeed from '@/components/ActivityFeed'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import logo from './Void_Logo_WhiteTransparent.png'
import { motion, useAnimationControls } from 'framer-motion'

export function HomeClient({ skeleton }: { skeleton: React.ReactNode }) {
  const [pfFilter, setPfFilter] = useState(true)
  const [dndFilter, setDndFilter] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const lastClickTime = useRef<number>(0)

  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const ownedWorld = useQuery(api.worlds.getWorldByOwner)
  const identity = useQuery(api.sessions.debugIdentity)

  useEffect(() => {
    if (identity) {
      console.log('--- AUTH DEBUG START ---')
      console.log('Status:', (identity as any).status || 'authenticated')
      console.log('Subject:', identity.subject)
      console.log('Issuer:', identity.issuer)
      console.log('Keys:', identity.keys)
      console.log('Full Identity:', identity.identity)
      console.log('--- AUTH DEBUG END ---')
    }
  }, [identity])

  const handleLogoClick = () => {
    const now = Date.now()
    const delta = now - lastClickTime.current
    
    // Increase velocity on click
    // Faster clicks = more velocity boost
    const boost = Math.max(5, 50 - Math.min(45, delta / 10))
    setVelocity(v => v + boost)
    lastClickTime.current = now
  }

  useEffect(() => {
    let frameId: number

    const update = () => {
      if (velocity > 0.1) {
        setRotation(r => (r + velocity) % 360)
        // Natural decay
        setVelocity(v => v * 0.98)
      } else if (velocity !== 0) {
        setVelocity(0)
      }
      frameId = requestAnimationFrame(update)
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [velocity])

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div className="flex flex-row items-center gap-4 w-full sm:w-auto">
          <motion.div 
            className="cursor-pointer select-none"
            onClick={handleLogoClick}
            animate={{ rotate: rotation }}
            transition={{ type: "tween", ease: "linear", duration: 0 }}
          >
            <Image src={logo} alt="Void Guild Logo" width={64} height={64} priority />
          </motion.div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Guild of The Void</h1>
            <p className="text-sm text-muted-foreground max-w-[300px] sm:max-w-none">
              Management tool for The Void Campaign.
            </p>
          </div>
        </div>
        <Authenticated>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-muted/30 p-1 rounded-md gap-1 mr-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPfFilter(!pfFilter)}
                    className={cn(
                        "h-9 w-9 p-0 transition-all duration-300",
                        pfFilter ? "opacity-100 scale-110 brightness-110 shadow-sm" : "opacity-30 grayscale scale-95"
                    )}
                    title={pfFilter ? "Hide Pathfinder" : "Show Pathfinder"}
                >
                    <img src="/PFVoid.svg" alt="Pathfinder" className="h-6 w-6" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDndFilter(!dndFilter)}
                    className={cn(
                        "h-9 w-9 p-0 transition-all duration-300",
                        dndFilter ? "opacity-100 scale-110 brightness-110 shadow-sm" : "opacity-30 grayscale scale-95"
                    )}
                    title={dndFilter ? "Hide D&D" : "Show D&D"}
                >
                    <img src="/DnDVoid.svg" alt="D&D" className="h-6 w-6" />
                </Button>
            </div>
            <a href="https://void.tarragon.be/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="flex items-center gap-2 h-9 w-9 sm:w-auto sm:px-3 p-0">
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Wiki</span>
              </Button>
            </a>
            <Link href="/stats">
              <Button variant="outline" size="sm" className="flex items-center gap-2 h-9 w-9 sm:w-auto sm:px-3 p-0">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </Button>
            </Link>
            {(isGM || ownedWorld) && (
              <Link href={ownedWorld ? `/world/${encodeURIComponent(ownedWorld.name)}` : "/world"}>
                <Button variant="outline" size="sm" className={cn(
                  "flex items-center gap-2 h-9 w-9 sm:w-auto sm:px-3 p-0",
                  ownedWorld && "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                )}>
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{ownedWorld ? "Your World" : "Worlds"}</span>
                </Button>
              </Link>
            )}
            <ThemeToggle />
            <UserButton />
          </div>
        </Authenticated>
        <AuthLoading>
            <div className="flex items-center gap-2 self-start sm:self-auto opacity-50">
                <div className="flex items-center bg-muted/30 p-1 rounded-md gap-1 mr-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                </div>
                <Skeleton className="h-9 w-9 sm:w-24" />
                <Skeleton className="h-9 w-9 sm:w-24" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </AuthLoading>
        <Unauthenticated>
          <div className="self-start sm:self-auto">
            <SignInButton />
          </div>
        </Unauthenticated>
      </div>

      <AuthLoading>
        {skeleton}
      </AuthLoading>

      <Authenticated>
        <Characters filters={{ pf: pfFilter, dnd: dndFilter }} />
        <ActivityFeed />
      </Authenticated>

      <Unauthenticated>
        {skeleton}
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
    </>
  )
}
