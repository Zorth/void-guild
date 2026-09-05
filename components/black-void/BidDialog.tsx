'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Coins, Zap, ExternalLink, ShieldCheck, User } from 'lucide-react'

interface BidDialogProps {
  isOpen: boolean
  onClose: () => void
  listing: any
  characterId: Id<'characters'> | null
}

export default function BidDialog({
  isOpen,
  onClose,
  listing,
  characterId,
}: BidDialogProps) {
  const [bidAmount, setBidAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const placeBid = useMutation(api.blackVoid.placeBid)

  if (!listing) return null

  const currentHighest = listing.winningAmount || 0
  const startingBid = listing.startingBid || 0
  const minRequired = currentHighest > 0 ? currentHighest + 1 : startingBid || 1

  const handlePlaceBid = async (isBuyout: boolean) => {
    if (!characterId) {
      toast.error('Please select an active character to place a bid.')
      return
    }

    let amount = isBuyout ? listing.buyoutPrice : parseFloat(bidAmount)

    if (!isBuyout && (!amount || amount < minRequired)) {
      toast.error(`Bid must be at least ${minRequired} GP.`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await placeBid({
        listingId: listing._id,
        characterId,
        amount: amount || 0,
        isBuyout,
      })

      if (res.isBuyout) {
        toast.success(`Purchased ${listing.name} via Buyout for ${res.amount} GP!`)
      } else {
        toast.success(`Placed bid of ${res.amount} GP on ${listing.name}!`)
      }
      setBidAmount('')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to place bid')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] border-purple-500/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-purple-300">
            <Coins className="h-5 w-5 text-amber-400" />
            Place Bid / Buyout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-foreground">{listing.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" /> Seller: {listing.sellerName} (Lvl {listing.sellerLevel})
                </p>
              </div>
              {listing.nethysUrl && (
                <a
                  href={listing.nethysUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded shrink-0"
                >
                  AoN Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {listing.description && (
              <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t border-border/20">
                {listing.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-purple-950/30 border border-purple-500/20 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Current Bid
              </span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {currentHighest > 0 ? `${currentHighest} GP` : startingBid > 0 ? `${startingBid} GP (Start)` : 'No bids'}
              </span>
              {listing.winningBidderName && (
                <span className="text-[10px] text-purple-300 block truncate mt-0.5">
                  by {listing.winningBidderName}
                </span>
              )}
            </div>

            <div className="p-3 rounded-md bg-emerald-950/30 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Buyout Price
              </span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {listing.buyoutPrice ? `${listing.buyoutPrice} GP` : 'N/A'}
              </span>
              <span className="text-[10px] text-emerald-300/70 block mt-0.5">
                {listing.buyoutPrice ? 'Instant Win' : 'Auction only'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/20">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Bid (Minimum {minRequired} GP)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={minRequired}
                step="any"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min ${minRequired} GP`}
                className="bg-muted/30 font-mono"
              />
              <Button
                type="button"
                onClick={() => handlePlaceBid(false)}
                disabled={isSubmitting || !characterId || listing.characterId === characterId}
                className="bg-purple-600 hover:bg-purple-700 font-semibold text-xs px-4"
              >
                Place Bid
              </Button>
            </div>
          </div>

          {listing.buyoutPrice && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePlaceBid(true)}
                disabled={isSubmitting || !characterId || listing.characterId === characterId}
                className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs flex items-center justify-center gap-1.5 h-10"
              >
                <Zap className="h-4 w-4 text-emerald-400" />
                Buy Out Now for {listing.buyoutPrice} GP
              </Button>
            </div>
          )}

          {listing.characterId === characterId && (
            <p className="text-[11px] text-amber-400 text-center italic">
              You cannot bid on your own character listing.
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
