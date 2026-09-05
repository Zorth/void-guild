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
import { Hammer, Percent, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'

interface ServiceListingDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
  characterLevel?: number
}

export default function ServiceListingDialog({
  isOpen,
  onClose,
  characterId,
  characterLevel = 1,
}: ServiceListingDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nethysUrl, setNethysUrl] = useState('')
  const [priceType, setPriceType] = useState<'percentage' | 'flat' | 'custom'>('percentage')
  const [percentage, setPercentage] = useState<string>('55')
  const [markupGp, setMarkupGp] = useState<string>('3')
  const [customPriceDetails, setCustomPriceDetails] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createServiceListing = useMutation(api.blackVoid.createServiceListing)

  const pctValue = parseFloat(percentage) || 0
  const isBelowBaseCraftingCost = priceType === 'percentage' && pctValue < 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!characterId) {
      toast.error('Please select an active character first.')
      return
    }

    if (!name.trim()) {
      toast.error('Service name is required.')
      return
    }

    let priceDetailsStr = ''
    if (priceType === 'percentage') {
      const p = parseFloat(percentage) || 0
      const m = parseFloat(markupGp) || 0
      priceDetailsStr = `${p}% of item base price`
      if (m > 0) priceDetailsStr += ` + ${m} GP`
    } else if (priceType === 'flat') {
      priceDetailsStr = `${markupGp || 0} GP flat fee`
    } else {
      priceDetailsStr = customPriceDetails
    }

    setIsSubmitting(true)
    try {
      await createServiceListing({
        characterId,
        name,
        description: description || undefined,
        nethysUrl: nethysUrl || undefined,
        priceType,
        percentage: priceType === 'percentage' ? parseFloat(percentage) : undefined,
        markupGp: parseFloat(markupGp) || undefined,
        priceDetails: priceDetailsStr,
      })
      toast.success('Crafting/Service listing posted!')
      setName('')
      setDescription('')
      setNethysUrl('')
      setPercentage('55')
      setMarkupGp('3')
      setCustomPriceDetails('')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to post service')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] border-amber-500/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-300">
            <Hammer className="h-5 w-5 text-amber-400" />
            Offer Crafting / Service
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Service Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weapon & Armor Crafting / Rune Transfer"
              required
              className="bg-muted/30 border-border/40 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-md text-xs">
            <span className="text-muted-foreground font-medium">Max Service / Item Level:</span>
            <span className="font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded font-mono">
              Level {characterLevel} (Equal to your Level)
            </span>
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
              placeholder="https://2e.aonprd.com/Rules.aspx?ID=..."
              className="bg-muted/30 border-border/40 text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pricing Structure
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={priceType === 'percentage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceType('percentage')}
                className="text-xs h-8"
              >
                % of Item Price
              </Button>
              <Button
                type="button"
                variant={priceType === 'flat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceType('flat')}
                className="text-xs h-8"
              >
                Flat GP Fee
              </Button>
              <Button
                type="button"
                variant={priceType === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceType('custom')}
                className="text-xs h-8"
              >
                Custom Details
              </Button>
            </div>
          </div>

          {priceType === 'percentage' && (
            <div className="space-y-3 p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3 text-amber-400" />
                    Percentage (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="55"
                    className="bg-background/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Optional Markup (+ GP)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={markupGp}
                    onChange={(e) => setMarkupGp(e.target.value)}
                    placeholder="3"
                    className="bg-background/80"
                  />
                </div>
              </div>

              {/* WARNING BOX FOR BELOW 50% CRAFTING COST */}
              {isBelowBaseCraftingCost && (
                <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-500/50 p-2.5 rounded text-xs text-red-200 animate-pulse">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-400 block mb-0.5">
                      ⚠️ Below Base Crafting Cost Warning!
                    </span>
                    In Pathfinder 2e, crafting an item costs <strong>50%</strong> of its base item price upon succeeding your crafting check. Charging less than 50% means you will pay out of pocket!
                  </div>
                </div>
              )}
            </div>
          )}

          {priceType === 'flat' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Flat Fee (GP)</label>
              <Input
                type="number"
                min={0}
                step="any"
                value={markupGp}
                onChange={(e) => setMarkupGp(e.target.value)}
                placeholder="e.g. 20 GP"
                className="bg-muted/30"
              />
            </div>
          )}

          {priceType === 'custom' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Custom Pricing Details
              </label>
              <Input
                value={customPriceDetails}
                onChange={(e) => setCustomPriceDetails(e.target.value)}
                placeholder="e.g. Materials provided by client + 10 GP labor fee"
                className="bg-muted/30 text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description / Notes (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="List prerequisites, turnaround time, formula access, or special terms..."
              className="min-h-[80px] bg-muted/30 border-border/40 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !characterId}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? 'Posting...' : 'Post Service Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
