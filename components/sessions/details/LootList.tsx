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
    Scroll, 
    Sparkles, 
    Package 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LootItem {
    id: string;
    name: string;
    link?: string;
    valueGP: number;
    isGood: boolean;
    isCurrency?: boolean;
    fromQuest?: boolean;
    isPerCharacter?: boolean;
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
    const [itemType, setItemType] = useState<'currency' | 'trade_good' | 'equipment'>('equipment')
    const [isPerCharacter, setIsPerCharacter] = useState(false)
    const [quantity, setQuantity] = useState<string>('1')

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

    const hasImportedQuestLoot = useMemo(() => {
        return loot.some(item => item.fromQuest)
    }, [loot])

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
        setItemType('equipment')
        setIsPerCharacter(false)
        setQuantity('1')
        setEditingItem(null)
    }

    const handleQuickCurrencyPreset = (amount: number) => {
        setName(amount >= 1 ? `${amount} Gold Pieces` : `${Math.round(amount * 10)} Silver Pieces`)
        setValueGP(amount.toString())
        setItemType('currency')
        setIsPerCharacter(false)
    }

    const handleNameChange = (val: string) => {
        setName(val)
        // If user types currency-like names, suggest switching to currency type so value isn't halved
        if (itemType === 'equipment') {
            const lower = val.toLowerCase()
            if (
                lower.includes('gold') || 
                lower.includes('coin') || 
                lower.includes('gp') || 
                lower.includes('silver') || 
                lower.includes('sp') || 
                lower.includes('copper') || 
                lower.includes('bounty')
            ) {
                setItemType('currency')
            }
        }
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
            const parsedQty = parseInt(quantity) || 1
            const isCurrencyItem = itemType === 'currency'
            const isGoodItem = isCurrencyItem || itemType === 'trade_good'

            await addLoot({
                sessionId: session._id,
                name: name.trim() || (isCurrencyItem ? 'Coin Bounty' : 'Item'),
                link: link.trim() || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood: isGoodItem,
                isCurrency: isCurrencyItem,
                isPerCharacter,
                quantity: parsedQty,
            })
            setIsAddDialogOpen(false)
            resetForm()
            toast.success(parsedQty > 1 ? `Added ${parsedQty} loot entries` : 'Loot added')
        } catch (e) {
            toast.error('Failed to add loot')
        }
    }

    const handleEdit = async () => {
        if (!editingItem) return
        try {
            const isCurrencyItem = itemType === 'currency'
            const isGoodItem = isCurrencyItem || itemType === 'trade_good'

            await editLoot({
                sessionId: session._id,
                lootId: editingItem.id,
                name: name.trim() || editingItem.name,
                link: link.trim() || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood: isGoodItem,
                isCurrency: isCurrencyItem,
                isPerCharacter,
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
            const baseVal = item.isGood || item.isCurrency ? item.valueGP : item.valueGP / 2
            const itemTotal = item.isPerCharacter ? baseVal * attendingCount : baseVal
            if (item.isCurrency) {
                totalCash += itemTotal
            } else {
                totalItemsResale += itemTotal
            }
        }

        const totalValue = totalCash + totalItemsResale
        const sharePerPlayer = totalValue / attendingCount

        // Only physical items (not auto-distributed currency) claimed by THIS character deduct from cash payout
        const userClaimedValue = loot
            .filter(item => {
                if (item.isCurrency) return false
                if (item.isPerCharacter) {
                    return Boolean(userCharacterInSession && item.claimedByCharacters?.includes(userCharacterInSession._id))
                }
                return Boolean(item.claimedBy && userCharacterIds.has(item.claimedBy))
            })
            .reduce((sum, item) => {
                const val = item.isGood ? item.valueGP : item.valueGP / 2
                return sum + val
            }, 0)

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
    }, [loot, session.attendingCharacters.length, userCharacterIds, userCharacterInSession])

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
                        Loot & Quest Rewards
                    </h3>
                    {!session.locked && (
                        <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                            Pre-Session
                        </span>
                    )}
                </div>
                {session.canManage && (
                    <div className="flex items-center gap-1.5">
                        {loot.length > 0 && (
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={isClearingLoot}
                                onClick={handleClearAll}
                                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 px-2 cursor-pointer"
                                title="Clear all loot entries"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Clear All</span>
                            </Button>
                        )}
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
                                {/* Type Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Loot Classification
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setItemType('currency')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                                itemType === 'currency' 
                                                    ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-sm" 
                                                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <Coins className="h-4 w-4 mb-1 text-amber-400" />
                                            <span>Coin / Currency</span>
                                            <span className="text-[9px] opacity-75 font-normal">Auto-split cash</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemType('trade_good')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                                itemType === 'trade_good' 
                                                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm" 
                                                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <Sparkles className="h-4 w-4 mb-1 text-emerald-400" />
                                            <span>Trade Good</span>
                                            <span className="text-[9px] opacity-75 font-normal">100% full value</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemType('equipment')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                                itemType === 'equipment' 
                                                    ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold shadow-sm" 
                                                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <Package className="h-4 w-4 mb-1 text-purple-400" />
                                            <span>Gear / Equipment</span>
                                            <span className="text-[9px] opacity-75 font-normal">50% resale</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Presets for Currency */}
                                {itemType === 'currency' && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        <span className="text-[11px] text-muted-foreground mr-1">Quick presets:</span>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                                            onClick={() => handleQuickCurrencyPreset(10)}
                                        >
                                            +10 GP
                                        </Button>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                                            onClick={() => handleQuickCurrencyPreset(50)}
                                        >
                                            +50 GP
                                        </Button>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                                            onClick={() => handleQuickCurrencyPreset(100)}
                                        >
                                            +100 GP
                                        </Button>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                                            onClick={() => handleQuickCurrencyPreset(500)}
                                        >
                                            +500 GP
                                        </Button>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Item or Bounty Name</label>
                                    <Input 
                                        value={name} 
                                        onChange={(e) => handleNameChange(e.target.value)} 
                                        placeholder={itemType === 'currency' ? "e.g. Gold Coins or Quest Bounty" : "e.g. +1 Striking Shortsword"} 
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
                                        <label className="text-xs font-medium">
                                            {itemType === 'currency' ? 'Amount in GP' : 'Value in GP'}
                                        </label>
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
                                            onCheckedChange={(val) => setIsPerCharacter(!!val)} 
                                            className="mt-0.5"
                                        />
                                        <label htmlFor="isPerCharacter" className="text-xs font-medium cursor-pointer leading-tight">
                                            <span>Award for <span className="font-bold underline text-primary">EACH</span> attending adventurer</span>
                                            <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                                {itemType === 'currency' 
                                                    ? "Multiplies the gold bounty so every party member receives this full amount in cash."
                                                    : "Creates a shared entry allowing every character to claim their own copy of the item."}
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
                    </div>
                )}
            </div>

            {/* Active Quest Rewards Banner */}
            {session.quest && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Scroll className="h-4 w-4 text-purple-400 shrink-0" />
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                Active Quest Rewards
                            </span>
                            {session.quest.isSponsored && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold">
                                    ★ 20% Guild Sponsored
                                </span>
                            )}
                            {session.quest.issuerCharacter && (
                                <span className="text-[10px] bg-muted/60 text-muted-foreground border border-border/40 px-1.5 py-0.5 rounded">
                                    Issuer: <strong className="text-purple-300">{session.quest.issuerCharacter.name}</strong> ({session.quest.issuerCharacter.rank || 'Adventurer'})
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{session.quest.name}:</span>
                            <span className="font-mono text-amber-300 font-semibold text-xs sm:text-sm">
                                {questRewardSummary || 'Custom reward'}
                            </span>
                        </div>
                        {session.quest.sponsoredAmount && (
                            <div className="text-[11px] text-muted-foreground">
                                Guild Reimbursement to Issuer: <span className="text-emerald-300 font-mono font-medium">{session.quest.sponsoredAmount}</span>
                                {session.quest.netCost && (
                                    <span> (Net out-of-pocket: <span className="text-purple-300 font-mono">{session.quest.netCost}</span>)</span>
                                )}
                            </div>
                        )}
                    </div>

                    {session.canManage && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {hasImportedQuestLoot ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isImportingQuest}
                                    onClick={() => handleImportQuest(true)}
                                    className="h-8 text-xs border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 gap-1.5 cursor-pointer"
                                >
                                    {isImportingQuest ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                    )}
                                    <span>Re-sync Quest Reward</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    disabled={isImportingQuest}
                                    onClick={() => handleImportQuest(false)}
                                    className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30 gap-1.5 shadow-sm cursor-pointer"
                                >
                                    {isImportingQuest ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                    <span>Import Quest Reward to Loot</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Guildmaster Cut Banner if assigned */}
            {session.guildmasterCutCharacterData && calculations && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2 text-xs gap-2">
                    <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                            <span className="text-muted-foreground">Regional Guildmaster: </span>
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
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 text-[11px]">
                            <Coins className="h-3.5 w-3.5 text-amber-400" />
                            Party Loot Pool
                        </span>
                        <div className="flex items-baseline gap-1.5 font-mono">
                            <span className="text-muted-foreground text-[11px]">Total Pool:</span>
                            <strong className="text-foreground text-sm font-black">{formatGP(calculations.totalValue)}</strong>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/30 text-[11px]">
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Cash Bounty (100%)</span>
                            <span className="font-mono font-semibold text-amber-300">+{formatGP(calculations.totalCash)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px]">Gear & Items (50% Resale)</span>
                            <span className="font-mono font-semibold text-purple-300">+{formatGP(calculations.totalItemsResale)}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-[10px]">Base Split ({session.attendingCharacters.length} {session.attendingCharacters.length === 1 ? 'adventurer' : 'adventurers'})</span>
                            <span className="font-mono font-bold text-primary">{formatGP(calculations.sharePerPlayer)} / player</span>
                        </div>
                    </div>
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
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider truncate text-left">
                                Your Net Payout ({userCharacterInSession.name})
                            </span>
                            {session.locked && (
                                <span className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                                    isClaimed && pendingMoneyAdjustmentGP === 0
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : isClaimed && pendingMoneyAdjustmentGP !== 0
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                                        : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                )}>
                                    {isClaimed 
                                        ? pendingMoneyAdjustmentGP !== 0 
                                            ? "Adjustment Needed" 
                                            : "On Sheet ✓" 
                                        : "Not on Sheet"}
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
                        {loot.filter(item => {
                            if (item.isCurrency) return false
                            if (item.isPerCharacter) {
                                return Boolean(userCharacterInSession && item.claimedByCharacters?.includes(userCharacterInSession._id))
                            }
                            return Boolean(item.claimedBy && userCharacterIds.has(item.claimedBy))
                        }).length > 0 && (
                            <div className="my-2.5 text-xs text-muted-foreground space-y-1 bg-background/40 p-2.5 rounded border border-border/30 text-left">
                                <div className="font-semibold text-[11px] text-foreground/80 mb-1">Claimed Gear (Deducted from Cash):</div>
                                {loot
                                    .filter(item => {
                                        if (item.isCurrency) return false
                                        if (item.isPerCharacter) {
                                            return Boolean(userCharacterInSession && item.claimedByCharacters?.includes(userCharacterInSession._id))
                                        }
                                        return Boolean(item.claimedBy && userCharacterIds.has(item.claimedBy))
                                    })
                                    .map((item) => {
                                        const val = item.isGood ? item.valueGP : item.valueGP / 2
                                        return (
                                            <div key={item.id} className="flex justify-between items-center gap-2 text-muted-foreground">
                                                <span className="truncate">- {item.name}</span>
                                                <span className="font-mono text-rose-300 shrink-0">-{formatGP(val)}</span>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}

                        <div className="text-[10px] text-muted-foreground mt-2 italic leading-normal">
                            Based on {formatGP(calculations.sharePerPlayer)} base share{calculations.userClaimedValue > 0 ? ` minus ${formatGP(calculations.userClaimedValue)} in claimed gear.` : '.'}
                        </div>

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
                        const isCurrency = item.isCurrency
                        const claimedCharacter = session.attendingCharacters.find(c => c._id === item.claimedBy)
                        const isClaimedByMe = item.claimedBy && userCharacterIds.has(item.claimedBy)
                        const resaleValue = item.isGood || isCurrency ? item.valueGP : item.valueGP / 2
                        const totalItemValue = item.isPerCharacter 
                            ? resaleValue * (session.attendingCharacters.length || 1) 
                            : resaleValue

                        return (
                            <Card 
                                key={item.id} 
                                className={cn(
                                    "overflow-hidden transition-all",
                                    isCurrency 
                                        ? "bg-amber-950/10 border-amber-500/30" 
                                        : "bg-card/50 border-border/40"
                                )}
                            >
                                <div className="p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-sm truncate flex items-center gap-1.5">
                                                {isCurrency && <Coins className="h-4 w-4 text-amber-400 shrink-0" />}
                                                {item.link ? (
                                                    <a 
                                                        href={item.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="hover:underline flex items-center gap-1 text-primary truncate"
                                                    >
                                                        <span>{item.name}</span>
                                                        <LinkIcon className="h-3 w-3 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="truncate">{item.name}</span>
                                                )}
                                            </h4>
                                            {isCurrency ? (
                                                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Coin / Currency
                                                </span>
                                            ) : item.isGood ? (
                                                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Trade Good (100%)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">
                                                    Gear (50% Resale)
                                                </span>
                                            )}
                                            {item.fromQuest && (
                                                <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Quest Reward
                                                </span>
                                            )}
                                            {item.isPerCharacter && (
                                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    For EACH Player
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                            {isCurrency ? (
                                                item.isPerCharacter ? (
                                                    <>
                                                        <span className="text-amber-300 font-mono font-medium">+{formatGP(item.valueGP)} / player</span>
                                                        <span className="opacity-50">|</span>
                                                        <span>Total Cash: {formatGP(totalItemValue)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-amber-300 font-mono font-medium">{formatGP(item.valueGP)} Total</span>
                                                        <span className="opacity-50">|</span>
                                                        <span>Split: {formatGP(item.valueGP / (session.attendingCharacters.length || 1))} / player</span>
                                                    </>
                                                )
                                            ) : item.isPerCharacter ? (
                                                <>
                                                    <span>Value: {formatGP(item.valueGP)} / player</span>
                                                    <span className="opacity-50">|</span>
                                                    <span>Total Resale: {formatGP(totalItemValue)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Value: {formatGP(item.valueGP)}</span>
                                                    <span className="opacity-50">|</span>
                                                    <span>Resale: {formatGP(resaleValue)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                        {/* If Currency: it is automatically distributed in cash payout */}
                                        {isCurrency ? (
                                            <span className="text-[11px] text-muted-foreground italic bg-muted/40 px-2 py-1 rounded border border-border/30">
                                                Auto-split in Cash
                                            </span>
                                        ) : item.isPerCharacter ? (
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                {/* If user's character has claimed this per-character item */}
                                                {userCharacterInSession && item.claimedByCharacters?.includes(userCharacterInSession._id) ? (
                                                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                                                        <User className="h-3 w-3 text-primary" />
                                                        <span className="text-[10px] font-bold">You Claimed</span>
                                                        <button 
                                                            onClick={() => handleUnclaim(item.id, userCharacterInSession._id)}
                                                            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                                                            title="Unclaim for yourself"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : userCharacterInSession ? (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-7 text-[10px] font-bold px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                                                        onClick={() => handleClaim(item.id, userCharacterInSession._id)}
                                                    >
                                                        Claim
                                                    </Button>
                                                ) : null}

                                                {/* Other characters claimed it */}
                                                {(item.claimedByCharacters?.length || 0) > 0 && (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {item.claimedByCharacters?.map((cId) => {
                                                            if (userCharacterInSession && cId === userCharacterInSession._id) return null
                                                            const otherChar = session.attendingCharacters.find(c => c._id === cId)
                                                            return (
                                                                <div key={cId} className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border/40">
                                                                    <span>{otherChar?.name || 'Claimed'}</span>
                                                                    {session.canManage && (
                                                                        <button 
                                                                            onClick={() => handleUnclaim(item.id, cId)}
                                                                            className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                                                                            title={`Unclaim for ${otherChar?.name || 'character'}`}
                                                                        >
                                                                            <X className="h-2.5 w-2.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : item.claimedBy ? (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border/40">
                                                <User className={cn("h-3 w-3", isClaimedByMe ? "text-primary" : "text-muted-foreground")} />
                                                <span className={cn("text-[10px] font-bold truncate max-w-[80px]", isClaimedByMe ? "text-primary" : "text-muted-foreground")}>
                                                    {isClaimedByMe ? 'You' : (claimedCharacter?.name || 'Claimed')}
                                                </span>
                                                {(isClaimedByMe || session.canManage) && (
                                                    <button 
                                                        onClick={() => handleUnclaim(item.id)}
                                                        className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                                                        title="Unclaim"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : userCharacterInSession ? (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-7 text-[10px] font-bold px-2 gap-1 cursor-pointer"
                                                onClick={() => handleClaim(item.id, userCharacterInSession._id)}
                                            >
                                                Claim
                                            </Button>
                                        ) : null}

                                        {session.canManage && (
                                            <div className="flex items-center gap-1 border-l pl-2 border-border/40">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 cursor-pointer" 
                                                    onClick={() => {
                                                        setEditingItem(item)
                                                        setName(item.name)
                                                        setLink(item.link || '')
                                                        setValueGP(item.valueGP.toString())
                                                        setItemType(item.isCurrency ? 'currency' : item.isGood ? 'trade_good' : 'equipment')
                                                        setIsPerCharacter(!!item.isPerCharacter)
                                                    }}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer" 
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
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
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setItemType('currency')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                            itemType === 'currency' 
                                                ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-sm" 
                                                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Coins className="h-4 w-4 mb-1 text-amber-400" />
                                        <span>Coin / Currency</span>
                                        <span className="text-[9px] opacity-75 font-normal">Auto-split cash</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setItemType('trade_good')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                            itemType === 'trade_good' 
                                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm" 
                                                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Sparkles className="h-4 w-4 mb-1 text-emerald-400" />
                                        <span>Trade Good</span>
                                        <span className="text-[9px] opacity-75 font-normal">100% full value</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setItemType('equipment')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer",
                                            itemType === 'equipment' 
                                                ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold shadow-sm" 
                                                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Package className="h-4 w-4 mb-1 text-purple-400" />
                                        <span>Gear / Equipment</span>
                                        <span className="text-[9px] opacity-75 font-normal">50% resale</span>
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

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Value in GP</label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={valueGP} 
                                    onChange={(e) => setValueGP(e.target.value)} 
                                />
                            </div>

                            <div className="pt-1">
                                <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/40 bg-muted/20">
                                    <Checkbox 
                                        id="isPerCharacterEdit" 
                                        checked={isPerCharacter} 
                                        onCheckedChange={(val) => setIsPerCharacter(!!val)} 
                                        className="mt-0.5"
                                    />
                                    <label htmlFor="isPerCharacterEdit" className="text-xs font-medium cursor-pointer leading-tight">
                                        <span>Award for <span className="font-bold underline text-primary">EACH</span> attending adventurer</span>
                                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                            {itemType === 'currency' 
                                                ? "Multiplies the gold bounty so every party member receives this full amount in cash."
                                                : "Creates a shared entry allowing every character to claim their own copy of the item."}
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

            {/* Guildmaster Assignment at the bottom of the loot section */}
            {session.canManage && (
                <div className="flex items-center justify-end pt-2 border-t border-border/40">
                    <Dialog open={isGuildmasterDialogOpen} onOpenChange={setIsGuildmasterDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 cursor-pointer"
                            >
                                <Crown className="h-3.5 w-3.5 text-amber-400" />
                                {session.guildmasterCutCharacterData ? 'Edit Regional Guildmaster' : 'Assign Regional Guildmaster'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-300">
                                    <Crown className="h-5 w-5 text-amber-400" />
                                    Assign Regional Guildmaster
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
