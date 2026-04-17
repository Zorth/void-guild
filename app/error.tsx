'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-block">
          <AlertCircle className="h-24 w-24 text-destructive/20 mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold font-gin text-destructive">!</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-taroca">The Void has glitched</h1>
          <p className="text-muted-foreground">
            An unexpected error has occurred in the Guild&apos;s systems.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => reset()} className="group">
            <RefreshCw className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180" />
            Try again
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
