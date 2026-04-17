import { Button } from '@/components/ui/button'
import { ChevronLeft, Ghost } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
      <div className="relative mb-8">
        <Ghost className="h-24 w-24 text-muted-foreground/20 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold font-gin">404</span>
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4 font-taroca">Lost in the Void</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        The page you are looking for has vanished into the aether.
      </p>
      <Button variant="outline" className="group" asChild>
        <a href="/">
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Safety
        </a>
      </Button>
    </div>
  )
}
