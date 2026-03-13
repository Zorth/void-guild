'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, AlertCircle } from 'lucide-react'

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  // If it's a Convex validation error for the ID, it's effectively a 404
  const isInvalidId = error.message.includes('not a valid ID') || 
                      error.message.includes('invalid value') ||
                      error.message.includes('Argument "sessionId" of query')

  if (isInvalidId) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <AlertCircle className="h-24 w-24 text-muted-foreground/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold font-gin">?</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 font-taroca">Invalid Session ID</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The session ID provided is malformed. Please check the URL and try again.
        </p>
        <a href="/">
          <Button variant="outline" className="group">
            <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Return to the Guild
          </Button>
        </a>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
      <div className="relative mb-8">
        <AlertCircle className="h-24 w-24 text-destructive/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold font-gin text-destructive">!</span>
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4 font-taroca">Something went wrong!</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        An unexpected error occurred while trying to load this session.
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => reset()}>Try again</Button>
        <a href="/">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </a>
      </div>
    </div>
  )
}
