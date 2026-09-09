'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
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
import { Hammer, Percent, AlertTriangle, ExternalLink, User } from 'lucide-react'

interface ServiceListingDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
  characterLevel?: number
  editingService?: any | null
  onSelectCharacter?: (id: Id<'characters'>) => void
}

export default function ServiceListingDialog({
  isOpen,
  onClose,
  characterId,
  characterLevel = 1,
  editingService = null,
  onSelectCharacter,
}: ServiceListingDialogProps) {
  const isEditing = !!editingService
  const [selectedCharId, setSelectedCharId] = useState<Id<'characters'> | null>(
    editingService?.characterId || characterId
  )
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nethysUrl, setNethysUrl] = useState('')
  const [priceType, setPriceType] = useState<'percentage' | 'flat' | 'custom'>('percentage')
  const [percentage, setPercentage] = useState<string>('55')
  const [markupGp, setMarkupGp] = useState<string>('3')
  const [customPriceDetails, setCustomPriceDetails] = useState<string>('')
  const [minLevel, setMinLevel] = useState<string>('')
  const [maxLevel, setMaxLevel] = useState<string>(String(characterLevel || 1))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userCharacters = useQuery(api.blackVoid.getUserCharacters)
  const createServiceListing = useMutation(api.blackVoid.createServiceListing)
  const updateServiceListing = useMutation(api.blackVoid.updateServiceListing)

  const activeChar = userCharacters?.find((c: any) => c._id === selectedCharId)
  const currentEffectiveLevel = activeChar?.lvl || characterLevel || 1

  useEffect(() => {
    if (editingService) {
      setSelectedCharId(editingService.characterId)
      setName(editingService.name || '')
      setDescription(editingService.description || '')
      setNethysUrl(editingService.nethysUrl || '')
      setPriceType(editingService.priceType || 'percentage')
      setPercentage(editingService.percentage !== undefined ? String(editingService.percentage) : '55')
      setMarkupGp(editingService.markupGp !== undefined ? String(editingService.markupGp) : '0')
      setCustomPriceDetails(editingService.priceDetails || '')
      setMinLevel(editingService.minLevel !== undefined ? String(editingService.minLevel) : '')
      setMaxLevel(editingService.maxLevel !== undefined ? String(editingService.maxLevel) : String(characterLevel || 1))
    } else {
      if (characterId) {
        setSelectedCharId(characterId)
      } else if (userCharacters && userCharacters.length > 0 && !selectedCharId) {
        setSelectedCharId(userCharacters[0]._id)
      }
      setName('')
      setDescription('')
      setNethysUrl('')
      setPriceType('percentage')
      setPercentage('55')
      setMarkupGp('3')
      setCustomPriceDetails('')
      setMinLevel('')
      setMaxLevel(String(characterLevel || 1))
    }
  }, [editingService, characterId, characterLevel, userCharacters, isOpen])

  const handleCharacterChange = (newId: Id<'characters'>) => {
    setSelectedCharId(newId)
    onSelectCharacter?.(newId)
    const newChar = userCharacters?.find((c: any) => c._id === newId)
    if (newChar) {
      setMaxLevel(String(newChar.lvl))
    }
  }

  const pctValue = parseFloat(percentage) || 0
  const isBelowBaseCraftingCost = priceType === 'percentage' && pctValue < 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetCharId = selectedCharId || characterId
    if (!targetCharId) {
      toast.error('Please select a character first.')
      return
    }

    if (!name.trim()) {
      toast.error('Service name is required.')
      return
    }

    const minLvlNum = minLevel.trim() ? parseInt(minLevel, 10) : undefined
    const maxLvlNum = maxLevel.trim() ? parseInt(maxLevel, 10) : currentEffectiveLevel

    if (minLvlNum !== undefined && (isNaN(minLvlNum) || minLvlNum < 1 || minLvlNum > 20)) {
      toast.error('Minimum level must be between 1 and 20.')
      return
    }

    if (maxLvlNum !== undefined && (isNaN(maxLvlNum) || maxLvlNum < 1 || maxLvlNum > 20)) {
      toast.error('Maximum level must be between 1 and 20.')
      return
    }

    if (maxLvlNum !== undefined && maxLvlNum > currentEffectiveLevel) {
      toast.error(`Maximum service level cannot exceed your character's level (${currentEffectiveLevel}).`)
      return
    }

    if (minLvlNum !== undefined && maxLvlNum !== undefined && minLvlNum > maxLvlNum) {
      toast.error('Minimum level cannot be greater than maximum level.')
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
      if (isEditing && editingService) {
        await updateServiceListing({
          listingId: editingService._id,
          characterId: targetCharId,
          name,
          description: description || undefined,
          nethysUrl: nethysUrl || undefined,
          priceType,
          percentage: priceType === 'percentage' ? parseFloat(percentage) : undefined,
          markupGp: parseFloat(markupGp) || undefined,
          priceDetails: priceDetailsStr,
          minLevel: minLvlNum,
          maxLevel: maxLvlNum,
        })
        toast.success('Crafting/Service listing updated!')
      } else {
        await createServiceListing({
          characterId: targetCharId,
          name,
          description: description || undefined,
          nethysUrl: nethysUrl || undefined,
          priceType,
          percentage: priceType === 'percentage' ? parseFloat(percentage) : undefined,
          markupGp: parseFloat(markupGp) || undefined,
          priceDetails: priceDetailsStr,
          minLevel: minLvlNum,
          maxLevel: maxLvlNum,
        })
        toast.success('Crafting/Service listing posted!')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : (isEditing ? 'Failed to update service' : 'Failed to post service'))
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
            {isEditing ? 'Edit Crafting / Service' : 'Offer Crafting / Service'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Character Selector */}
          <div className="space-y-1.5 bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-400" />
                Service Provider Character <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] font-mono text-amber-400/90 font-semibold">
                Lvl {currentEffectiveLevel}
              </span>
            </div>
            <select
              value={selectedCharId || ''}
              onChange={(e) => handleCharacterChange(e.target.value as Id<'characters'>)}
              className="w-full h-9 rounded-md border border-amber-500/40 bg-background/90 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 text-foreground"
            >
              {(userCharacters || []).map((char: any) => (
                <option key={char._id} value={char._id}>
                  {char.name} (Lvl {char.lvl} {char.class || 'Adventurer'})
                </option>
              ))}
            </select>
          </div>

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

          <div className="space-y-1.5 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground font-medium">Service Level Range:</span>
              <span className="text-[10px] text-amber-400/80">
                Max available: Level {currentEffectiveLevel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Min Level (Optional)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={Math.min(20, currentEffectiveLevel)}
                  value={minLevel}
                  onChange={(e) => setMinLevel(e.target.value)}
                  placeholder="e.g. 1"
                  className="bg-background/80 h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Max Level
                </label>
                <Input
                  type="number"
                  min={1}
                  max={Math.min(20, currentEffectiveLevel)}
                  value={maxLevel}
                  onChange={(e) => setMaxLevel(e.target.value)}
                  placeholder={String(currentEffectiveLevel)}
                  className="bg-background/80 h-8 text-xs"
                />
              </div>
            </div>
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
              disabled={isSubmitting || !selectedCharId}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save Changes' : 'Post Service Listing')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
