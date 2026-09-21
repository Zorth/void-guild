'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Footer() {
  const pathname = usePathname()

  // Remove footer from all map pages so scrolling only zooms the map without scrolling the webpage
  if (pathname?.includes('/map')) {
    return null
  }

  return (
    <footer className="py-12 border-t border-muted/10 mt-12">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <Link href="/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <span className="text-muted/40">•</span>
          <Link href="/privacy" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <span className="text-muted/40">•</span>
          <Link href="/cookies" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
            Cookie Policy
          </Link>
        </div>
        <p>
          Developed by{' '}
          <a 
            href="https://zorth.eu" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            Zorth
          </a>
        </p>
        <p className="text-[11px] text-muted-foreground/60 max-w-xl mx-auto">
          Guild of The Void is an unofficial campaign management tool. Pathfinder and D&amp;D trademarks and logos are property of their respective owners. Virtual currency has no real-world value.
        </p>
      </div>
    </footer>
  )
}
