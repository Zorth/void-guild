'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarDays, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const FEED_URL = `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? ''}/calendar.ics`

export function CalendarFeedDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL)
      setIsCopied(true)
      toast.success('Calendar link copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link, select it and copy manually')
    }
  }

  // webcal:// opens the default calendar app and subscribes directly.
  const webcalUrl = FEED_URL.replace(/^https?:\/\//, 'webcal://')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-400" />
            Calendar Feed
          </DialogTitle>
          <DialogDescription>
            Subscribe to all public Guild sessions in Google Calendar, Outlook or Apple Calendar. Events include the quest, world, GM, signups and location, and update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input readOnly value={FEED_URL} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy calendar link">
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={webcalUrl}>Open in calendar app</a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Calendar apps refresh subscribed feeds on their own schedule, so changes can take a few hours to appear (Google is the slowest, up to a day). Private sessions are not included, and sessions are shown as 4 hours long.
        </p>
      </DialogContent>
    </Dialog>
  )
}
