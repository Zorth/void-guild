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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Coins, Tag, Clock, ExternalLink, PackagePlus } from 'lucide-react'

interface ItemListingDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
}

export default function ItemListingDialog({
  isOpen,
  onClose,
  characterId,
}: ItemListingDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nethysUrl, setNethysUrl] = useState('')
  const [startingBid, setStartingBid] = useState<string>('')
  const [buyoutPrice, setBuyoutPrice] = useState<string>('')
  const [durationDays, setDurationDays] = useState<number>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createItemListing = useMutation(api.blackVoid.createItemListing)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!characterId) {
      toast.error('Please select an active character first.')
      return
    }

    const startGp = startingBid !== '' ? parseFloat(startingBid) : undefined
    const buyoutGp = buyoutPrice !== '' ? parseFloat(buyoutPrice) : undefined

    if (startGp === undefined && buyoutGp === undefined) {
      toast.error('Listing must have a starting bid, buyout price, or both.')
      return
    }

    if (startGp !== undefined && buyoutGp !== undefined && buyoutGp < startGp) {
      toast.error('Buyout price cannot be less than starting bid.')
      return
    }

    setIsSubmitting(true)
    try {
      await createItemListing({
        characterId,
        name,
        description: description || undefined,
        nethysUrl: nethysUrl || undefined,
        startingBid: startGp,
        buyoutPrice: buyoutGp,
        durationDays,
      })
      toast.success('Item listing posted to The Black Void!')
      setName('')
      setDescription('')
      setNethysUrl('')
      setStartingBid('')
      setBuyoutPrice('')
      setDurationDays(7)
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to post listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-purple-500/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-300">
            <PackagePlus className="h-5 w-5 text-purple-400" />
            List Item on The Black Void
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-purple-400" />
              Item Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. +1 Striking Shortsword or Wand of Healing"
              required
              className="bg-muted/30 border-border/40 focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              Archives of Nethys Link (Optional)
            </label>
            <Input
              type="url"
              value={nethysUrl}
              onChange={(e) => setNethysUrl(e.target.value)}
              placeholder="https://2e.aonprd.com/Equipment.aspx?ID=..."
              className="bg-muted/30 border-border/40 focus:border-purple-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                Starting Bid (GP)
              </label>
              <Input
                type="number"
                min={1}
                step="any"
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                placeholder="Optional start"
                className="bg-muted/30 border-border/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-emerald-400" />
                Buyout Price (GP)
              </label>
              <Input
                type="number"
                min={1}
                step="any"
                value={buyoutPrice}
                onChange={(e) => setBuyoutPrice(e.target.value)}
                placeholder="Optional instant buy"
                className="bg-muted/30 border-border/40"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            * Must specify at least a Starting Bid or a Buyout Price.
          </p>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                Auction Duration <span className="text-destructive">*</span>
              </label>
              <span className="text-xs font-semibold text-purple-300">
                {durationDays} {durationDays === 1 ? 'day' : 'days'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1 Day</span>
              <span>7 Days</span>
              <span>14 Days</span>
              <span>30 Days</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description / Condition (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide item details, runes, or flavor background..."
              className="min-h-[80px] bg-muted/30 border-border/40 text-xs"
            />
          </div>

          <div className="p-2.5 rounded-md bg-purple-950/40 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>0% Market Tax:</strong> You will keep 100% of the gold earned when sold!
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !characterId}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {isSubmitting ? 'Posting...' : 'Post Item Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
