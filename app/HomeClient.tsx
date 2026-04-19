'use client'

import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton, UserButton } from '@clerk/nextjs'
import Characters from '@/components/characters/Characters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Book, Globe, Sparkles, Key } from 'lucide-react'
import ActivityFeed from '@/components/ActivityFeed'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ApiKeyDialog } from '@/components/ApiKeyDialog'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import logo from './Void_Logo_WhiteTransparent.png'
import { motion, useMotionValue, useAnimationFrame } from 'framer-motion'

export function HomeClient({ skeleton }: { skeleton: React.ReactNode }) {
  const [pfFilter, setPfFilter] = useState(true)
  const [dndFilter, setDndFilter] = useState(true)
  const rotation = useMotionValue(0)
  const velocityRef = useRef(0)
  const [hasReachedRainbow, setHasReachedRainbow] = useState(false)
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false)

  const incrementLogoClicks = useMutation(api.users.incrementLogoClicks)
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const ownedWorld = useQuery(api.worlds.getWorldByOwner)

  const handleLogoClick = () => {
    // Balanced boost to allow building momentum
    velocityRef.current += 6
    
    incrementLogoClicks().catch(console.error)
  }

  useAnimationFrame((time, delta) => {
    const deltaMultiplier = delta / 16.67

    // Threshold of 40 means ~8-10 clicks to unlock
    if (velocityRef.current > 40 && !hasReachedRainbow) {
      setHasReachedRainbow(true)
    }

    if (velocityRef.current > 0.05 || hasReachedRainbow) {
      const currentRotation = rotation.get()
      const speed = Math.max(velocityRef.current, hasReachedRainbow ? 0.8 : 0)
      
      rotation.set((currentRotation + (speed * deltaMultiplier * 0.4)) % 360)
      
      // Slower decay (0.992) to allow stacking speed over a few seconds
      if (velocityRef.current > 0) {
        velocityRef.current *= Math.pow(0.992, deltaMultiplier)
        if (velocityRef.current < 0.05) velocityRef.current = 0
      }
    }
  })

  const isRainbow = hasReachedRainbow

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div className="flex flex-row items-center gap-4 w-full sm:w-auto">
          <motion.div 
            className={cn("cursor-pointer select-none", isRainbow && "rainbow-logo hyper-spin")}
            onClick={handleLogoClick}
            style={{ rotate: rotation }}
          >
            <Image src={logo} alt="Void Guild Logo" width={64} height={64} priority />
          </motion.div>
          <div className="flex flex-col gap-1">
            <h1 className={cn("text-3xl sm:text-4xl font-bold tracking-tight transition-all duration-500 flex items-center gap-2", isRainbow && "rainbow-text scale-105 origin-left")}>
                Guild of The Void
                {isRainbow && <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />}
            </h1>
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
            <ThemeToggle />
            <UserButton>
                <UserButton.MenuItems>
                    <UserButton.Action 
                        label="API Access" 
                        labelIcon={<Key className="h-4 w-4" />} 
                        onClick={() => setIsApiDialogOpen(true)} 
                    />
                </UserButton.MenuItems>
            </UserButton>
            <ApiKeyDialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen} />
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
