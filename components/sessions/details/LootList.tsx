'use client'

import { useState, useMemo } from 'react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Coins, 
    Link as LinkIcon, 
    X, 
    User, 
    Crown, 
    CheckCheck, 
    CheckCircle2, 
    Loader2, 
    Sparkles, 
    Package,
    Shield,
    Search 
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AoNItemResult {
    id: string;
    name: string;
    url?: string;
    priceInGP?: number;
    priceRaw?: string;
    category?: string;
}

interface LootItem {
    id: string;
    name: string;
    link?: string;
    valueGP: number;
    isGood: boolean;
    isCurrency?: boolean;
    fromQuest?: boolean;
    isPerCharacter?: boolean;
    quantity?: number;
    claimedBy?: Id<'characters'>;
    claimedByCharacters?: Id<'characters'>[];
}

interface LootListProps {
    session: Doc<'sessions'> & { 
        isOwner: boolean; 
        canManage: boolean; 
        attendingCharacters: Doc<'characters'>[];
        guildmasterCutCharacterData?: Doc<'characters'> | null;
        quest?: (Doc<'quests'> & {
            issuerCharacter?: {
                _id: Id<'characters'>;
                name: string;
                rank?: string;
                lvl: number;
            } | null;
        }) | null;
    };
    userCharacterIds: Set<Id<'characters'>>;
}

export default function LootList({ session, userCharacterIds }: LootListProps) {
    const addLoot = useMutation(api.sessions.addLoot)
    const editLoot = useMutation(api.sessions.editLoot)
    const deleteLoot = useMutation(api.sessions.deleteLoot)
    const claimLoot = useMutation(api.sessions.claimLoot)
    const unclaimLoot = useMutation(api.sessions.unclaimLoot)
    const importQuestRewardsToLoot = useMutation(api.sessions.importQuestRewardsToLoot)
    const clearAllLoot = useMutation(api.sessions.clearAllLoot)
    const setSessionGuildmasterCut = useMutation(api.sessions.setSessionGuildmasterCut)
    const toggleSessionMoneyClaimed = useMutation(api.sessions.toggleSessionMoneyClaimed)
    const toggleGuildmasterCutClaimed = useMutation(api.sessions.toggleGuildmasterCutClaimed)
    const guildmasters = useQuery(api.characters.listGuildmasters)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isGuildmasterDialogOpen, setIsGuildmasterDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<LootItem | null>(null)
    const [selectedGmId, setSelectedGmId] = useState<string>(session.guildmasterCut?.characterId || '')
    const [isTogglingClaim, setIsTogglingClaim] = useState(false)
    const [isTogglingGmClaim, setIsTogglingGmClaim] = useState(false)
    const [isImportingQuest, setIsImportingQuest] = useState(false)
    const [isClearingLoot, setIsClearingLoot] = useState(false)

    // Form states
    const [name, setName] = useState('')
    const [link, setLink] = useState('')
    const [valueGP, setValueGP] = useState<string>('0')
    const [isGood, setIsGood] = useState(false)
    const [isPerCharacter, setIsPerCharacter] = useState(false)
    const [quantity, setQuantity] = useState<string>('1')

    // AoN Search states
    const [aonQuery, setAonQuery] = useState('')
    const [aonSearchResults, setAonSearchResults] = useState<AoNItemResult[]>([])
    const [isSearchingAon, setIsSearchingAon] = useState(false)

    const loot = (session as any).loot as LootItem[] || []

    const userCharacterInSession = useMemo(() => {
        return session.attendingCharacters.find(c => userCharacterIds.has(c._id))
    }, [session.attendingCharacters, userCharacterIds])

    const claimStatus = useQuery(
        api.sessions.getSessionClaimStatus,
        session.locked && userCharacterInSession?._id
            ? { sessionId: session._id, characterId: userCharacterInSession._id }
            : "skip"
    )

    const questRewardSummary = useMemo(() => {
        if (!session.quest) return null
        const q = session.quest
        const parts: string[] = []
        if (q.rewardMoneyGP && q.rewardMoneyGP > 0) {
            const formattedMoney = q.rewardMoneyGP % 1 === 0
                ? `${q.rewardMoneyGP.toLocaleString()} GP`
                : `${q.rewardMoneyGP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
            parts.push(`${formattedMoney}${q.rewardType === 'per_person' ? ' / player' : ' party pool'}`)
        }
        if (q.rewardOther && q.rewardOther.trim()) {
            parts.push(q.rewardOther.trim())
        }
        if (parts.length === 0 && q.reward && q.reward.trim()) {
            parts.push(q.reward.trim())
        }
        return parts.join(' + ')
    }, [session.quest])

    const handleSetGuildmaster = async (charId: string) => {
        try {
            await setSessionGuildmasterCut({
                sessionId: session._id,
                characterId: charId ? (charId as Id<'characters'>) : undefined,
            })
            setSelectedGmId(charId)
            setIsGuildmasterDialogOpen(false)
            toast.success(charId ? 'Guildmaster assigned to session!' : 'Guildmaster removed from session')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update Guildmaster')
        }
    }

    const resetForm = () => {
        setName('')
        setLink('')
        setValueGP('0')
        setIsGood(false)
        setIsPerCharacter(false)
        setQuantity('1')
        setEditingItem(null)
        setAonQuery('')
        setAonSearchResults([])
    }

    const handleSearchAon = async (searchVal: string) => {
        const q = searchVal.trim()
        if (!q) {
            setAonSearchResults([])
            return
        }
        setIsSearchingAon(true)
        try {
            const res = await fetch(`/api/nethys/item?q=${encodeURIComponent(q)}`)
            if (res.ok) {
                const data = await res.json()
                const results = data.results || []
                setAonSearchResults(results)
                if (results.length === 0) {
                    toast.info(`No items found matching "${q}" on Archives of Nethys`)
                }
            } else {
                setAonSearchResults([])
                toast.error('Archives of Nethys search failed')
            }
        } catch (e) {
            console.error('Failed to search AoN:', e)
            toast.error('Failed to connect to Archives of Nethys')
        } finally {
            setIsSearchingAon(false)
        }
    }

    const handleSelectAonItem = (hit: AoNItemResult) => {
        setName(hit.name)
        if (hit.url) setLink(hit.url)
        if (hit.priceInGP !== undefined && hit.priceInGP > 0) {
            setValueGP(hit.priceInGP.toString())
        }
        setIsGood(false)
        setAonSearchResults([])
        setAonQuery('')
        toast.success(`Loaded "${hit.name}" from Archives of Nethys!`)
    }

    const handleImportQuest = async (overwrite: boolean = false) => {
        if (isImportingQuest) return
        setIsImportingQuest(true)
        try {
            const res = await importQuestRewardsToLoot({
                sessionId: session._id,
                overwriteExisting: overwrite,
            })
            toast.success(
                overwrite
                    ? `Re-synced ${res.count} quest reward item(s)`
                    : `Imported ${res.count} quest reward item(s) to loot!`
            )
        } catch (e: any) {
            toast.error(e?.message || 'Failed to import quest rewards')
        } finally {
            setIsImportingQuest(false)
        }
    }

    const handleAdd = async () => {
        try {
            const parsedQty = Math.max(1, parseInt(quantity) || 1)

            await addLoot({
                sessionId: session._id,
                name: name.trim() || (isGood ? 'Trade Good / Currency' : 'Item'),
                link: link.trim() || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood,
                isCurrency: false,
                isPerCharacter,
                quantity: parsedQty,
            })
            setIsAddDialogOpen(false)
            resetForm()
            toast.success(parsedQty > 1 ? `Added ${parsedQty}x ${name.trim() || 'loot'}` : 'Loot added')
        } catch (e) {
            toast.error('Failed to add loot')
        }
    }

    const handleEdit = async () => {
        if (!editingItem) return
        try {
            const parsedQty = Math.max(1, parseInt(quantity) || 1)
            await editLoot({
                sessionId: session._id,
                lootId: editingItem.id,
                name: name.trim() || editingItem.name,
                link: link.trim() || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood,
                isCurrency: false,
                isPerCharacter,
                quantity: parsedQty,
            })
            setEditingItem(null)
            resetForm()
            toast.success('Loot updated')
        } catch (e) {
            toast.error('Failed to update loot')
        }
    }

    const handleDelete = async (lootId: string) => {
        if (!confirm('Are you sure you want to delete this loot entry?')) return
        try {
            await deleteLoot({ sessionId: session._id, lootId })
            toast.success('Loot deleted')
        } catch (e) {
            toast.error('Failed to delete loot')
        }
    }

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear all loot from this session? This action cannot be undone.')) return
        setIsClearingLoot(true)
        try {
            await clearAllLoot({ sessionId: session._id })
            toast.success('All loot cleared from session')
        } catch (e: any) {
            toast.error(e?.message || 'Failed to clear loot')
        } finally {
            setIsClearingLoot(false)
        }
    }

    const handleClaim = async (lootId: string, characterId: Id<'characters'>) => {
        try {
            await claimLoot({ sessionId: session._id, lootId, characterId })
            toast.success('Item claimed for your character')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to claim loot')
        }
    }

    const handleUnclaim = async (lootId: string, characterId?: Id<'characters'>) => {
        try {
            await unclaimLoot({ sessionId: session._id, lootId, characterId })
            toast.success('Item unclaimed')
        } catch (e) {
            toast.error('Failed to unclaim loot')
        }
    }

    const formatGP = (val: number) => {
        const isNegative = val < 0
        const absVal = Math.abs(val)
        const total_cp = Math.round(absVal * 100)
        const gp = Math.floor(total_cp / 100)
        const sp = Math.floor((total_cp % 100) / 10)
        const cp = total_cp % 10

        const parts = []
        if (gp > 0) parts.push(`${gp.toLocaleString()} GP`)
        if (sp > 0) parts.push(`${sp} SP`)
        if (cp > 0) parts.push(`${cp} CP`)
        
        const result = parts.length > 0 ? parts.join(' ') : '0 GP'
        return isNegative ? `-${result}` : result
    }

    const calculations = useMemo(() => {
        const attendingCount = session.attendingCharacters.length
        if (attendingCount === 0) return null

        let totalCash = 0
        let totalItemsResale = 0

        for (const item of loot) {
            const isGoodOrCurrency = item.isGood || item.isCurrency
            const baseVal = isGoodOrCurrency ? item.valueGP : item.valueGP / 2
            const qty = item.quantity ?? 1
            const itemTotal = baseVal * qty
            if (item.isCurrency) {
                totalCash += itemTotal
            } else {
                totalItemsResale += itemTotal
            }
        }

        const totalValue = totalCash + totalItemsResale
        const sharePerPlayer = totalValue / attendingCount

        // Claimed items (trade goods at 100%, gear at 50% resale) claimed by THIS character deduct from their cash payout
        let userClaimedValue = 0
        if (userCharacterInSession) {
            for (const item of loot) {
                const isGoodOrCurrency = item.isGood || item.isCurrency
                const unitVal = isGoodOrCurrency ? item.valueGP : item.valueGP / 2
                const claimedList = item.claimedByCharacters && item.claimedByCharacters.length > 0
                    ? item.claimedByCharacters
                    : (item.claimedBy ? [item.claimedBy] : [])
                const myClaimCount = claimedList.filter(id => id === userCharacterInSession._id).length
                userClaimedValue += myClaimCount * unitVal
            }
        }

        const userFinalShare = sharePerPlayer - userClaimedValue
        const guildmasterCutValue = Math.round(totalValue * 0.2 * 100) / 100

        return {
            totalValue,
            totalCash,
            totalItemsResale,
            sharePerPlayer,
            userFinalShare,
            userClaimedValue,
            guildmasterCutValue,
        }
    }, [loot, session.attendingCharacters.length, userCharacterInSession])

    const userClaimedItems = useMemo(() => {
        if (!userCharacterInSession) return []
        return loot
            .map((item) => {
                if (item.isCurrency) return null
                const isGoodOrCurrency = item.isGood || item.isCurrency
                const unitVal = isGoodOrCurrency ? item.valueGP : item.valueGP / 2
                const claimedList = item.claimedByCharacters && item.claimedByCharacters.length > 0
                    ? item.claimedByCharacters
                    : (item.claimedBy ? [item.claimedBy] : [])
                const count = claimedList.filter((id) => id === userCharacterInSession._id).length
                if (count === 0) return null
                return {
                    id: item.id,
                    name: item.name,
                    count,
                    totalVal: unitVal * count,
                }
            })
            .filter((item): item is { id: string; name: string; count: number; totalVal: number } => item !== null)
    }, [loot, userCharacterInSession])

    const currentNetMoneyGP = calculations ? Math.round(calculations.userFinalShare * 100) / 100 : 0
    const isClaimed = Boolean(claimStatus?.isClaimed)
    const previousClaimedAmount = claimStatus?.claimedMoneyAmount ?? 0
    const pendingMoneyAdjustmentGP = isClaimed
        ? Math.round((currentNetMoneyGP - previousClaimedAmount) * 100) / 100
        : currentNetMoneyGP

    const handleToggleSessionMoneyClaim = async () => {
        if (!userCharacterInSession || isTogglingClaim) return
        setIsTogglingClaim(true)
        try {
            await toggleSessionMoneyClaimed({
                sessionId: session._id,
                characterId: userCharacterInSession._id,
                currentNetMoneyGP,
            })
            toast.success(
                !isClaimed
                    ? `Marked ${formatGP(currentNetMoneyGP)} as added to ${userCharacterInSession.name}'s sheet!`
                    : pendingMoneyAdjustmentGP !== 0
                    ? `Updated ${userCharacterInSession.name}'s sheet with adjustment (${pendingMoneyAdjustmentGP > 0 ? '+' : ''}${formatGP(pendingMoneyAdjustmentGP)})!`
                    : `Removed session loot from ${userCharacterInSession.name}'s sheet log`
            )
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update sheet status')
        } finally {
            setIsTogglingClaim(false)
        }
    }

    const handleToggleGmCutClaim = async () => {
        if (!session.guildmasterCutCharacterData || isTogglingGmClaim) return
        setIsTogglingGmClaim(true)
        try {
            await toggleGuildmasterCutClaimed({
                sessionId: session._id,
                characterId: session.guildmasterCutCharacterData._id,
            })
            toast.success(
                session.guildmasterCut?.claimed
                    ? 'Removed GM compensation from sheet log'
                    : `Marked GM compensation as added to ${session.guildmasterCutCharacterData.name}'s sheet!`
            )
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update Guildmaster compensation status')
        } finally {
            setIsTogglingGmClaim(false)
        }
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Header with Title and Add Button */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                        <Coins className="text-primary h-5 w-5" />
                        Session Loot
                    </h3>
                </div>
                {session.canManage && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={resetForm} className="h-8 gap-1.5 cursor-pointer">
                                <Plus className="h-3.5 w-3.5" />
                                Add Loot
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-primary" />
                                    <span>Add Session Loot</span>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-3">
                                {/* Archives of Nethys Search */}
                                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                                    <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                        <Search className="h-3.5 w-3.5" />
                                        <span>Search Archives of Nethys (AoN)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. Bag of Holding, Striking Rune, Elixir of Life..."
                                            value={aonQuery}
                                            onChange={(e) => setAonQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleSearchAon(aonQuery)
                                                }
                                            }}
                                            className="h-8 text-xs bg-background/60"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSearchAon(aonQuery)}
                                            disabled={isSearchingAon}
                                            className="h-8 text-xs shrink-0 border-purple-500/40 text-purple-300 hover:bg-purple-900/40 cursor-pointer"
                                        >
                                            {isSearchingAon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                                        </Button>
                                    </div>

                                    {/* Search Results Dropdown / List */}
                                    {aonSearchResults.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 bg-background/95 divide-y divide-border/30 mt-2">
                                            {aonSearchResults.map((hit) => (
                                                <div
                                                    key={hit.id}
                                                    onClick={() => handleSelectAonItem(hit)}
                                                    className="p-2 hover:bg-purple-900/30 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors"
                                                >
                                                    <div className="truncate">
                                                        <span className="font-bold text-foreground">{hit.name}</span>
                                                        {hit.category && (
                                                            <span className="text-[10px] text-muted-foreground ml-2 capitalize">
                                                                ({hit.category})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-amber-300 font-bold">
                                                        {hit.priceInGP ? `${hit.priceInGP} GP` : hit.priceRaw || '0 GP'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Type Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Loot Classification
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsGood(true)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                                isGood 
                                                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm" 
                                                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <Sparkles className="h-4 w-4 mb-1 text-emerald-400" />
                                            <span>Trade Good / Currency</span>
                                            <span className="text-[9px] opacity-75 font-normal">100% Value • Claimable</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsGood(false)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                                !isGood 
                                                    ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold shadow-sm" 
                                                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <Package className="h-4 w-4 mb-1 text-purple-400" />
                                            <span>Gear / Equipment</span>
                                            <span className="text-[9px] opacity-75 font-normal">50% Resale • Claimable</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Item or Bounty Name</label>
                                    <Input 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder={
                                            isGood 
                                                ? "e.g. Silver Bars, Flawless Ruby, or Gold Bounty" 
                                                : "e.g. +1 Striking Shortsword or Cloak of Elvenkind"
                                        } 
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Link (Optional - e.g. Archives of Nethys or 5e Tools)</label>
                                    <Input 
                                        value={link} 
                                        onChange={(e) => setLink(e.target.value)} 
                                        placeholder="https://..." 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">Value in GP</label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={valueGP} 
                                            onChange={(e) => setValueGP(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">Quantity</label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={quantity} 
                                            onChange={(e) => setQuantity(e.target.value)} 
                                        />
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/40 bg-muted/20">
                                        <Checkbox 
                                            id="isPerCharacter" 
                                            checked={isPerCharacter} 
                                            onCheckedChange={(val) => {
                                                const checked = !!val
                                                setIsPerCharacter(checked)
                                                const attendeeCount = Math.max(1, session.attendingCharacters.length)
                                                const currentQty = Math.max(1, parseInt(quantity) || 1)
                                                if (checked) {
                                                    setQuantity(String(currentQty * attendeeCount))
                                                } else {
                                                    setQuantity(String(Math.max(1, Math.floor(currentQty / attendeeCount))))
                                                }
                                            }} 
                                            className="mt-0.5"
                                        />
                                        <label htmlFor="isPerCharacter" className="text-xs font-medium cursor-pointer leading-tight">
                                            <span>Award for <span className="font-bold underline text-primary">EACH</span> attending adventurer ({session.attendingCharacters.length} {session.attendingCharacters.length === 1 ? 'player' : 'players'})</span>
                                            <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                                Multiplies the quantity by {session.attendingCharacters.length} (the number of adventurers in this session).
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAdd} className="cursor-pointer">Add Loot Item</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>


            {/* Guildmaster Cut Banner if assigned */}
            {session.guildmasterCutCharacterData && calculations && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2 text-xs gap-2">
                    <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                            <span className="text-muted-foreground">Guildmaster: </span>
                            <strong className="text-amber-300 font-semibold">{session.guildmasterCutCharacterData.name}</strong>
                            <span className="text-muted-foreground text-[11px] ml-1.5">(Lvl {session.guildmasterCutCharacterData.lvl})</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 font-mono flex-wrap">
                        <span className="text-muted-foreground text-[11px]">20% Compensation:</span>
                        <strong className="text-amber-300 font-bold">+{formatGP(calculations.guildmasterCutValue)}</strong>
                        {session.locked && userCharacterIds.has(session.guildmasterCutCharacterData._id) && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isTogglingGmClaim}
                                onClick={handleToggleGmCutClaim}
                                className={cn(
                                    "h-auto min-h-7 py-1 px-2.5 text-[10px] font-semibold transition-all shrink-0 gap-1 whitespace-normal break-words text-center cursor-pointer",
                                    session.guildmasterCut?.claimed 
                                        ? "border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50" 
                                        : "border-amber-500/40 text-amber-300 bg-amber-950/40 hover:bg-amber-950/60"
                                )}
                            >
                                {isTogglingGmClaim ? (
                                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                ) : session.guildmasterCut?.claimed ? (
                                    <>
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                        <span>Marked as Added to Sheet ✓</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCheck className="h-3 w-3 shrink-0" />
                                        <span>Mark as Added to Sheet</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Party Loot Pool Summary Card */}
            {calculations && (
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 text-[11px]">
                        <Coins className="h-3.5 w-3.5 text-amber-400" />
                        Party Loot Pool
                    </span>
                    <strong className="text-foreground font-mono font-black text-sm">{formatGP(calculations.totalValue)}</strong>
                </div>
            )}

            {/* Your Share Card */}
            {userCharacterInSession && calculations && (
                <Card className={cn(
                    "border transition-all overflow-hidden",
                    session.locked 
                        ? isClaimed && pendingMoneyAdjustmentGP === 0
                            ? "bg-emerald-950/20 border-emerald-500/30"
                            : isClaimed && pendingMoneyAdjustmentGP !== 0
                            ? "bg-amber-950/20 border-amber-500/40"
                            : "bg-purple-950/20 border-purple-500/30"
                        : "bg-primary/5 border-primary/20"
                )}>
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-bold tracking-wider truncate text-left">
                                {userCharacterInSession.name}&apos;s loot:
                            </span>
                            {session.locked && isClaimed && (
                                <span className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                                    pendingMoneyAdjustmentGP === 0
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                                )}>
                                    {pendingMoneyAdjustmentGP !== 0 
                                        ? "Adjustment Needed" 
                                        : "On Sheet ✓"}
                                </span>
                            )}
                        </div>

                        <div className={cn(
                            "text-2xl font-black font-mono my-1 break-words",
                            session.locked && isClaimed && pendingMoneyAdjustmentGP === 0
                                ? "text-emerald-300"
                                : session.locked && isClaimed && pendingMoneyAdjustmentGP !== 0
                                ? "text-amber-300"
                                : "text-primary"
                        )}>
                            {formatGP(calculations.userFinalShare)}
                        </div>

                        {/* Deducted Claimed Physical Items */}
                        {userClaimedItems.length > 0 && (
                            <div className="my-2.5 text-xs text-muted-foreground space-y-1 bg-background/40 p-2.5 rounded border border-border/30 text-left">
                                <div className="flex justify-between items-center gap-2 text-foreground/90 font-medium pb-1 border-b border-border/20">
                                    <span>Base amount:</span>
                                    <span className="font-mono text-foreground font-semibold">{formatGP(calculations.sharePerPlayer)}</span>
                                </div>
                                <div className="space-y-1 pt-0.5">
                                    {userClaimedItems.map((claimed) => (
                                        <div key={claimed.id} className="flex justify-between items-center gap-2 text-muted-foreground">
                                            <span className="truncate">
                                                - {claimed.count > 1 ? `${claimed.count}x ` : ''}{claimed.name}
                                            </span>
                                            <span className="font-mono text-rose-300 shrink-0">- {formatGP(claimed.totalVal)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {session.locked && (
                            <div className="pt-3 mt-3 border-t border-border/30 flex flex-col gap-2">
                                {isClaimed && pendingMoneyAdjustmentGP !== 0 && (
                                    <div className="text-xs font-medium text-amber-300 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded text-left">
                                        {pendingMoneyAdjustmentGP > 0 ? (
                                            <span>⚠️ Loot increased: <strong className="text-emerald-300 font-mono">+{formatGP(pendingMoneyAdjustmentGP)}</strong> pending (previously marked {formatGP(previousClaimedAmount)})</span>
                                        ) : (
                                            <span>⚠️ Loot decreased: <strong className="text-rose-300 font-mono">-{formatGP(Math.abs(pendingMoneyAdjustmentGP))}</strong> pending (previously marked {formatGP(previousClaimedAmount)})</span>
                                        )}
                                    </div>
                                )}
                                <Button
                                    size="sm"
                                    disabled={isTogglingClaim}
                                    onClick={handleToggleSessionMoneyClaim}
                                    className={cn(
                                        "w-full h-auto min-h-9 py-2 px-3 text-xs font-semibold gap-1.5 transition-all shadow-sm cursor-pointer whitespace-normal break-words text-center flex items-center justify-center",
                                        !isClaimed
                                            ? "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30"
                                            : pendingMoneyAdjustmentGP !== 0
                                            ? "bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/30"
                                            : "border border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 hover:text-emerald-200"
                                    )}
                                    variant={isClaimed && pendingMoneyAdjustmentGP === 0 ? "outline" : "default"}
                                >
                                    {isTogglingClaim ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                            <span>Updating Sheet...</span>
                                        </>
                                    ) : !isClaimed ? (
                                        <>
                                            <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                                            <span>Mark as Added to Sheet</span>
                                        </>
                                    ) : pendingMoneyAdjustmentGP !== 0 ? (
                                        <>
                                            <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                                            <span>Mark Adjustment on Sheet</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                            <span>Marked as Added to Sheet ✓</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Loot List */}
            {loot.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="py-8 text-center space-y-3">
                        <p className="text-muted-foreground text-sm">No loot recorded for this session yet.</p>
                        {session.quest && session.canManage && (
                            <div className="flex flex-col items-center gap-2 pt-1">
                                <Button
                                    size="sm"
                                    disabled={isImportingQuest}
                                    onClick={() => handleImportQuest(false)}
                                    className="h-9 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white gap-2 shadow-sm cursor-pointer"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>Import {session.quest.name} Rewards</span>
                                </Button>
                                <span className="text-[11px] text-muted-foreground">
                                    Populates {questRewardSummary} into the session loot pool automatically.
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {loot.map((item) => {
                        const isGoodOrCurrency = item.isGood || item.isCurrency
                        const itemQty = Math.max(1, item.quantity ?? 1)
                        const resaleValue = isGoodOrCurrency ? item.valueGP : item.valueGP / 2
                        const totalItemValue = resaleValue * itemQty

                        const claimedList = item.claimedByCharacters && item.claimedByCharacters.length > 0
                            ? item.claimedByCharacters
                            : (item.claimedBy ? [item.claimedBy] : [])
                        const remainingSlots = Math.max(0, itemQty - claimedList.length)

                        return (
                            <Card 
                                key={item.id} 
                                className={cn(
                                    "overflow-hidden transition-all",
                                    isGoodOrCurrency 
                                        ? "bg-emerald-950/10 border-emerald-500/30" 
                                        : "bg-card/50 border-border/40"
                                )}
                            >
                                <div className="px-3 py-2 flex flex-col gap-1.5">
                                    {/* Row 1: Header (Icon + Qty + Name + Quest Badge + Management actions) */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                                            {isGoodOrCurrency ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button 
                                                            type="button" 
                                                            className="inline-flex items-center cursor-help p-0 m-0 bg-transparent border-0 text-inherit focus:outline-none" 
                                                            title="sells for full price"
                                                            aria-label="sells for full price"
                                                        >
                                                            <Coins className="h-4 w-4 text-emerald-400 shrink-0" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        sells for full price
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button 
                                                            type="button" 
                                                            className="inline-flex items-center cursor-help p-0 m-0 bg-transparent border-0 text-inherit focus:outline-none" 
                                                            title="sells for half price"
                                                            aria-label="sells for half price"
                                                        >
                                                            <Shield className="h-4 w-4 text-muted-foreground/70 hover:text-foreground shrink-0" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        sells for half price
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            {itemQty > 1 && (
                                                <span className="font-mono text-[10px] font-black bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded shrink-0">
                                                    {itemQty}x
                                                </span>
                                            )}
                                            {item.link ? (
                                                <a 
                                                    href={item.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="font-bold text-sm hover:underline inline-flex items-center gap-1 text-primary break-words"
                                                >
                                                    <span>{item.name}</span>
                                                    <LinkIcon className="h-3 w-3 shrink-0" />
                                                </a>
                                            ) : (
                                                <span className="font-bold text-sm text-foreground break-words">{item.name}</span>
                                            )}
                                            {item.fromQuest && (
                                                <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                                                    Quest
                                                </span>
                                            )}
                                        </div>

                                        {session.canManage && (
                                            <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer" 
                                                    title="Edit Item"
                                                    onClick={() => {
                                                        setEditingItem(item)
                                                        setName(item.name)
                                                        setLink(item.link || '')
                                                        setValueGP(item.valueGP.toString())
                                                        setQuantity((item.quantity || 1).toString())
                                                        setIsGood(Boolean(item.isGood || item.isCurrency))
                                                        setIsPerCharacter(!!item.isPerCharacter)
                                                    }}
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer" 
                                                    title="Delete Item"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 2: Price */}
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                        <span>
                                            worth {itemQty > 1 ? `${formatGP(item.valueGP * itemQty)} (${formatGP(item.valueGP)} each)` : formatGP(item.valueGP)}
                                        </span>
                                    </div>

                                    {/* Row 3: Claiming & slots section */}
                                    <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-1.5 flex-wrap">
                                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                            {claimedList.length === 0 ? (
                                                <span className="text-[11px] text-muted-foreground/75 italic">
                                                    Unclaimed {itemQty > 1 ? `(${itemQty} available)` : ''}
                                                </span>
                                            ) : (
                                                claimedList.map((charId, idx) => {
                                                    const isMyChar = Boolean(userCharacterInSession && charId === userCharacterInSession._id)
                                                    const charName = session.attendingCharacters.find(c => c._id === charId)?.name || 'Claimed'
                                                    return (
                                                        <div 
                                                            key={`${charId}-${idx}`} 
                                                            className={cn(
                                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium",
                                                                isMyChar
                                                                    ? "bg-primary/15 text-primary border-primary/30"
                                                                    : "bg-muted/50 text-muted-foreground border-border/40"
                                                            )}
                                                        >
                                                            <User className={cn("h-2.5 w-2.5 shrink-0", isMyChar ? "text-primary" : "text-muted-foreground")} />
                                                            <span className="truncate max-w-[100px]">{isMyChar ? `${charName} (You)` : charName}</span>
                                                            {(isMyChar || session.canManage) && (
                                                                <button 
                                                                    onClick={() => handleUnclaim(item.id, charId)}
                                                                    className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                                                                    title={`Unclaim for ${charName}`}
                                                                >
                                                                    <X className="h-2.5 w-2.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>

                                        <div className="shrink-0 ml-auto">
                                            {remainingSlots > 0 && userCharacterInSession ? (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-6 text-[10px] font-bold px-2 gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                                                    onClick={() => handleClaim(item.id, userCharacterInSession._id)}
                                                >
                                                    Claim {remainingSlots > 1 ? `(${remainingSlots})` : ''}
                                                </Button>
                                            ) : remainingSlots === 0 ? (
                                                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                    All Claimed ✓
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Edit Loot Dialog */}
            {editingItem && (
                <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit2 className="h-5 w-5 text-primary" />
                                <span>Edit Loot Entry</span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            {/* Type Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Loot Classification
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsGood(true)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                            isGood 
                                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm" 
                                                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Sparkles className="h-4 w-4 mb-1 text-emerald-400" />
                                        <span>Trade Good / Currency</span>
                                        <span className="text-[9px] opacity-75 font-normal">100% Value • Claimable</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsGood(false)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                            !isGood 
                                                ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold shadow-sm" 
                                                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Package className="h-4 w-4 mb-1 text-purple-400" />
                                        <span>Gear / Equipment</span>
                                        <span className="text-[9px] opacity-75 font-normal">50% Resale • Claimable</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Item Name</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Link (Optional)</label>
                                <Input value={link} onChange={(e) => setLink(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Value in GP</label>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        value={valueGP} 
                                        onChange={(e) => setValueGP(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Quantity</label>
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        value={quantity} 
                                        onChange={(e) => setQuantity(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="pt-1">
                                <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/40 bg-muted/20">
                                    <Checkbox 
                                        id="isPerCharacterEdit" 
                                        checked={isPerCharacter} 
                                        onCheckedChange={(val) => {
                                            const checked = !!val
                                            setIsPerCharacter(checked)
                                            const attendeeCount = Math.max(1, session.attendingCharacters.length)
                                            const currentQty = Math.max(1, parseInt(quantity) || 1)
                                            if (checked) {
                                                setQuantity(String(currentQty * attendeeCount))
                                            } else {
                                                setQuantity(String(Math.max(1, Math.floor(currentQty / attendeeCount))))
                                            }
                                        }} 
                                        className="mt-0.5"
                                    />
                                    <label htmlFor="isPerCharacterEdit" className="text-xs font-medium cursor-pointer leading-tight">
                                        <span>Award for <span className="font-bold underline text-primary">EACH</span> attending adventurer ({session.attendingCharacters.length} {session.attendingCharacters.length === 1 ? 'player' : 'players'})</span>
                                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                            Multiplies the quantity by {session.attendingCharacters.length} (the number of adventurers in this session).
                                        </p>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleEdit} className="cursor-pointer">Update Loot Item</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Guildmaster Assignment & Loot Management at the bottom of the loot section */}
            {session.canManage && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    {loot.length > 0 ? (
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            disabled={isClearingLoot}
                            onClick={handleClearAll}
                            className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 px-2 cursor-pointer"
                            title="Clear all loot entries from session"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Clear All Loot</span>
                        </Button>
                    ) : <div />}
                    <Dialog open={isGuildmasterDialogOpen} onOpenChange={setIsGuildmasterDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 cursor-pointer"
                            >
                                <Crown className="h-3.5 w-3.5 text-amber-400" />
                                Guildmaster
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-300">
                                    <Crown className="h-5 w-5 text-amber-400" />
                                    Guildmaster
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-3 text-sm">
                                <p className="text-xs text-muted-foreground">
                                    Assign a Guildmaster (Level 14+) to this session. They will be compensated an extra <strong>20% of the total session loot value</strong> by the Guild of the Void.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Select Guildmaster
                                    </label>
                                    <select
                                        value={selectedGmId}
                                        onChange={(e) => setSelectedGmId(e.target.value)}
                                        className="w-full bg-muted/40 border border-border/40 text-foreground rounded-md px-3 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="">-- None (No Guildmaster assigned) --</option>
                                        {guildmasters?.map((gm) => (
                                            <option key={gm._id} value={gm._id} className="bg-popover text-foreground">
                                                {gm.name} (Lvl {gm.lvl})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {calculations && (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Session Loot:</span>
                                            <span className="font-mono font-medium text-foreground">{formatGP(calculations.totalValue)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-amber-300">
                                            <span>Guildmaster 20% Cut:</span>
                                            <span className="font-mono">+{formatGP(calculations.guildmasterCutValue)}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground pt-1 italic">
                                            * Note: Players&apos; shares are NOT reduced; this extra compensation is paid by the Guild of the Void and claimed in The Black Void.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                {session.guildmasterCut?.characterId && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleSetGuildmaster('')}
                                        className="text-muted-foreground hover:text-destructive mr-auto cursor-pointer"
                                    >
                                        Remove
                                    </Button>
                                )}
                                <Button onClick={() => handleSetGuildmaster(selectedGmId)} className="cursor-pointer">
                                    Save Guildmaster
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    )
}
