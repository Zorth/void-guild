'use client'

import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ClipboardList } from 'lucide-react'

interface ServiceOrderDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Acting character, either the provider or the client */
  characterId?: Id<'characters'> | null
  /** Proposing a new order after contact was made */
  inquiry?: { _id: Id<'blackVoidInquiries'>; serviceName: string; counterpartName: string } | null
  /** Countering the terms of an existing order */
  order?: any | null
}

export default function ServiceOrderDialog({
  isOpen,
  onClose,
  characterId = null,
  inquiry = null,
  order = null,
}: ServiceOrderDialogProps) {
  const isCounter = !!order
  const [priceGp, setPriceGp] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const proposeOrder = useMutation(api.blackVoidOrders.proposeOrder)
  const proposeTerms = useMutation(api.blackVoidOrders.proposeTerms)

  useEffect(() => {
    if (!isOpen) return
    setPriceGp(order ? String(order.priceGp) : '')
    setItemName(order?.itemName ?? '')
    setItemQty(String(order?.itemQty ?? 1))
    setDescription(order?.description ?? '')
  }, [isOpen, order])

  const serviceName = order?.serviceName ?? inquiry?.serviceName ?? 'Service'
  const counterpartName = order?.counterpartName ?? inquiry?.counterpartName ?? 'the other party'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const terms = {
      priceGp: parseFloat(priceGp) || 0,
      itemName: itemName.trim() || undefined,
      itemQty: itemName.trim() ? Math.max(1, parseInt(itemQty, 10) || 1) : undefined,
      description: description.trim() || undefined,
    }
    setIsSubmitting(true)
    try {
      if (isCounter && characterId) {
        await proposeTerms({ orderId: order._id, characterId, ...terms })
        toast.success('New terms proposed.')
      } else if (inquiry && characterId) {
        await proposeOrder({ inquiryId: inquiry._id, characterId, ...terms })
        toast.success(`Proposal sent to ${counterpartName}.`)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border border-amber-500/30 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-300 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            {isCounter ? 'Propose New Terms' : 'Propose Standing Order'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {serviceName} with {counterpartName}. They have to accept the terms before the order is agreed, and
            it is announced in the Discord inquiry thread. Once delivered, the payment and item show up on both
            character sheet logs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Agreed price (GP)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={priceGp}
              onChange={(e) => setPriceGp(e.target.value)}
              placeholder="0"
              className="bg-muted/30 border-border/40 text-xs"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Item delivered to buyer (optional)</label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. +1 Striking Longsword"
                className="bg-muted/30 border-border/40 text-xs"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Qty</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="bg-muted/30 border-border/40 text-xs"
                disabled={isSubmitting || !itemName.trim()}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Materials provided, deadline, anything else you agreed on..."
              className="min-h-[70px] bg-muted/30 border-border/40 text-xs resize-none"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Propose Terms'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
