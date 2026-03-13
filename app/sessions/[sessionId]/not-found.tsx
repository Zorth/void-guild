import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Ghost } from 'lucide-react'

export default function SessionNotFound() {
  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
      <div className="relative mb-8">
        <Ghost className="h-24 w-24 text-muted-foreground/20 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold font-gin">404</span>
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4 font-taroca">Session Vanished</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        This session seems to have slipped into the Void. It either never existed or has been unmade by a Voidmaster.
      </p>
      <Button variant="outline" className="group" asChild>
        <a href="/">
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Return to the Guild
        </a>
      </Button>
    </div>
  )
}
