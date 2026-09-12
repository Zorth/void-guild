import { useState, useEffect } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Coins, Tag, Clock, ExternalLink, PackagePlus, User, Copy, CheckCircle2, Briefcase, Search, Sparkles, Loader2, ChevronDown } from 'lucide-react'

interface ItemListingDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
  onSelectCharacter?: (id: Id<'characters'>) => void
}

export default function ItemListingDialog({
  isOpen,
  onClose,
  characterId,
  onSelectCharacter,
}: ItemListingDialogProps) {
  const [selectedCharId, setSelectedCharId] = useState<Id<'characters'> | null>(characterId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nethysUrl, setNethysUrl] = useState('')
  const [startingBid, setStartingBid] = useState<string>('')
  const [buyoutPrice, setBuyoutPrice] = useState<string>('')
  const [durationDays, setDurationDays] = useState<number>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const userCharacters = useQuery(api.blackVoid.getUserCharacters, {system: 'PF'})
  const characterInventory = useQuery(
    api.blackVoid.getCharacterInventory,
    selectedCharId ? { characterId: selectedCharId } : 'skip'
  )
  const createItemListing = useMutation(api.blackVoid.createItemListing)
  const lookupNethysItem = useAction(api.blackVoid.lookupNethysItem)

  useEffect(() => {
    if (characterId) {
      setSelectedCharId(characterId)
    } else if (userCharacters && userCharacters.length > 0 && !selectedCharId) {
      setSelectedCharId(userCharacters[0]._id)
    }
  }, [characterId, userCharacters, isOpen])

  const handleCharacterChange = (newId: Id<'characters'>) => {
    setSelectedCharId(newId)
    onSelectCharacter?.(newId)
  }

  const activeChar = userCharacters?.find((c: any) => c._id === selectedCharId)

  const handleSelectItemFromInventory = async (itemName: string) => {
    setName(itemName)
    setIsInventoryOpen(false)
    setIsLookingUp(true)

    try {
      const result = await lookupNethysItem({ itemName })
      if (result) {
        if (result.nethysUrl) setNethysUrl(result.nethysUrl)
        if (result.priceInGP) {
          setBuyoutPrice(String(result.priceInGP))
        }
        toast.success(`Selected "${itemName}" from inventory!`, {
          description: result.priceInGP
            ? `Linked to AoN & set buyout to ${result.priceInGP} GP.`
            : `Linked to Archives of Nethys.`,
          icon: '🎒',
        })
      } else {
        toast.info(`Selected "${itemName}" from inventory.`, {
          description: 'No matching price found on Archives of Nethys.',
        })
      }
    } catch (err) {
      console.error(err)
      toast.info(`Selected "${itemName}" from inventory.`)
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleLookupNethys = async () => {
    if (!name.trim()) {
      toast.error('Enter an item name to look up on Archives of Nethys.')
      return
    }
    setIsLookingUp(true)
    try {
      const result = await lookupNethysItem({ itemName: name.trim() })
      if (result) {
        if (result.nethysUrl) setNethysUrl(result.nethysUrl)
        if (result.priceInGP) setBuyoutPrice(String(result.priceInGP))
        toast.success(`Found "${result.name}" on Archives of Nethys!`, {
          description: result.priceInGP
            ? `Listed price: ${result.priceInGP} GP.`
            : `AoN URL linked.`,
          icon: '🔍',
        })
      } else {
        toast.error(`No result found on Archives of Nethys for "${name}".`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to look up item on Archives of Nethys.')
    } finally {
      setIsLookingUp(false)
    }
  }

  const [lastSubmittedName, setLastSubmittedName] = useState<string | null>(null)

  const resetForm = (keepItemDetails = false) => {
    if (!keepItemDetails) {
      setName('')
      setDescription('')
      setNethysUrl('')
    }
    setStartingBid('')
    setBuyoutPrice('')
    setDurationDays(7)
    setLastSubmittedName(null)
  }

  const handleSubmit = async (e: React.FormEvent, listAnother = false) => {
    e.preventDefault()
    const targetCharId = selectedCharId || characterId
    if (!targetCharId) {
      toast.error('Please select a character to list this item.')
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
        characterId: targetCharId,
        name,
        description: description || undefined,
        nethysUrl: nethysUrl || undefined,
        startingBid: startGp,
        buyoutPrice: buyoutGp,
        durationDays,
      })

      if (listAnother) {
        // Keep item details, clear only prices for the next copy
        setLastSubmittedName(name)
        setStartingBid('')
        setBuyoutPrice('')
        toast.success(`Listed "${name}" — form ready for another copy!`)
      } else {
        toast.success('Item listing posted to The Black Void!')
        resetForm()
        onClose()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to post listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[500px] border-purple-500/40 bg-card/95 backdrop-blur-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-300">
            <PackagePlus className="h-5 w-5 text-purple-400" />
            List Item on The Black Void
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Character Selector */}
          <div className="space-y-1.5 bg-purple-950/20 border border-purple-500/30 p-2.5 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-400" />
                Seller Character <span className="text-destructive">*</span>
              </label>
              {activeChar?.money && (
                <span className="text-[11px] font-mono text-amber-300 font-semibold flex items-center gap-1">
                  <Coins className="h-3 w-3 text-amber-400" />
                  {activeChar.money.totalInGold % 1 === 0
                    ? activeChar.money.totalInGold.toLocaleString()
                    : activeChar.money.totalInGold.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{' '}
                  GP
                </span>
              )}
            </div>
            <select
              value={selectedCharId || ''}
              onChange={(e) => handleCharacterChange(e.target.value as Id<'characters'>)}
              className="w-full h-9 rounded-md border border-purple-500/40 bg-background/90 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 text-foreground"
            >
              {(userCharacters || []).map((char: any) => (
                <option key={char._id} value={char._id}>
                  {char.name} (Lvl {char.lvl} {char.class || 'Adventurer'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-purple-400" />
                Item Name <span className="text-destructive">*</span>
              </label>

              {characterInventory && characterInventory.length > 0 && (
                <Popover open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5"
                    >
                      <Briefcase className="h-3 w-3 text-purple-400" />
                      Select from Inventory ({characterInventory.length})
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-2 bg-slate-950/95 border-purple-500/30 text-foreground shadow-2xl backdrop-blur-xl rounded-xl space-y-1.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 flex justify-between items-center">
                      <span>Character Inventory</span>
                      <span className="text-purple-400 font-mono">{characterInventory.length} Items</span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto space-y-1 pt-1 scrollbar-thin">
                      {characterInventory.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectItemFromInventory(item.name)}
                          className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between hover:bg-purple-950/60 text-muted-foreground hover:text-purple-200 border border-transparent hover:border-purple-500/30 transition-all group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate group-hover:text-purple-300">
                              {item.name}
                            </span>
                            {item.qty > 1 && (
                              <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30 shrink-0">
                                ×{item.qty}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground/60 shrink-0 ml-2">
                            {item.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. +1 Striking Shortsword or Wand of Healing"
                required
                className="bg-muted/30 border-border/40 focus:border-purple-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLookupNethys}
                disabled={isLookingUp || !name.trim()}
                className="h-9 px-3 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 font-semibold text-xs shrink-0 gap-1"
                title="Search Archives of Nethys for item URL & buyout price"
              >
                {isLookingUp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                )}
                <span className="hidden sm:inline">Lookup AoN</span>
              </Button>
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
              <span>1 Day (Min)</span>
              <span>30 Days (Max)</span>
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

          {/* Success Banner: just listed another copy */}
          {lastSubmittedName && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[11px] text-emerald-200 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>&ldquo;{lastSubmittedName}&rdquo;</strong> listed successfully! Set new prices below or close the dialog.
              </span>
            </div>
          )}

          <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => {
              resetForm()
              onClose()
            }} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting || !selectedCharId || !name.trim()}
                className="flex-1 sm:flex-initial border-purple-500/40 text-purple-300 hover:bg-purple-500/10 font-semibold text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                {isSubmitting ? 'Posting...' : 'Post & List Another'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedCharId}
                className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                {isSubmitting ? 'Posting...' : 'Post & Close'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
