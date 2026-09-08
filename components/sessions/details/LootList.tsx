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
import { Plus, Edit2, Trash2, Coins, Link as LinkIcon, Check, X, User, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LootItem {
    id: string;
    name: string;
    link?: string;
    valueGP: number;
    isGood: boolean;
    isPerCharacter?: boolean;
    claimedBy?: Id<'characters'>;
}

interface LootListProps {
    session: Doc<'sessions'> & { 
        isOwner: boolean; 
        canManage: boolean; 
        attendingCharacters: Doc<'characters'>[];
        guildmasterCutCharacterData?: Doc<'characters'> | null;
    };
    userCharacterIds: Set<Id<'characters'>>;
}

export default function LootList({ session, userCharacterIds }: LootListProps) {
    const addLoot = useMutation(api.sessions.addLoot)
    const editLoot = useMutation(api.sessions.editLoot)
    const deleteLoot = useMutation(api.sessions.deleteLoot)
    const claimLoot = useMutation(api.sessions.claimLoot)
    const unclaimLoot = useMutation(api.sessions.unclaimLoot)
    const setSessionGuildmasterCut = useMutation(api.sessions.setSessionGuildmasterCut)
    const guildmasters = useQuery(api.characters.listGuildmasters)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isGuildmasterDialogOpen, setIsGuildmasterDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<LootItem | null>(null)
    const [selectedGmId, setSelectedGmId] = useState<string>(session.guildmasterCut?.characterId || '')

    const [name, setName] = useState('')
    const [link, setLink] = useState('')
    const [valueGP, setValueGP] = useState<string>('0')
    const [isGood, setIsGood] = useState(false)
    const [isPerCharacter, setIsPerCharacter] = useState(false)
    const [quantity, setQuantity] = useState<string>('1')

    const loot = (session as any).loot as LootItem[] || []

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
    }

    const handleAdd = async () => {
        try {
            await addLoot({
                sessionId: session._id,
                name,
                link: link || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood,
                isPerCharacter,
                quantity: parseInt(quantity) || 1
            })
            setIsAddDialogOpen(false)
            resetForm()
            toast.success('Loot added')
        } catch (e) {
            toast.error('Failed to add loot')
        }
    }

    const handleEdit = async () => {
        if (!editingItem) return
        try {
            await editLoot({
                sessionId: session._id,
                lootId: editingItem.id,
                name,
                link: link || undefined,
                valueGP: parseFloat(valueGP) || 0,
                isGood,
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
        if (!confirm('Are you sure you want to delete this loot?')) return
        try {
            await deleteLoot({ sessionId: session._id, lootId })
            toast.success('Loot deleted')
        } catch (e) {
            toast.error('Failed to delete loot')
        }
    }

    const handleClaim = async (lootId: string, characterId: Id<'characters'>) => {
        try {
            await claimLoot({ sessionId: session._id, lootId, characterId })
            toast.success('Loot claimed')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to claim loot')
        }
    }

    const handleUnclaim = async (lootId: string) => {
        try {
            await unclaimLoot({ sessionId: session._id, lootId })
            toast.success('Loot unclaimed')
        } catch (e) {
            toast.error('Failed to unclaim loot')
        }
    }

    const userCharacterInSession = useMemo(() => {
        return session.attendingCharacters.find(c => userCharacterIds.has(c._id))
    }, [session.attendingCharacters, userCharacterIds])

    const formatGP = (val: number) => {
        const isNegative = val < 0
        const absVal = Math.abs(val)
        const total_cp = Math.round(absVal * 100)
        const gp = Math.floor(total_cp / 100)
        const sp = Math.floor((total_cp % 100) / 10)
        const cp = total_cp % 10

        const parts = []
        if (gp > 0) parts.push(`${gp} GP`)
        if (sp > 0) parts.push(`${sp} SP`)
        if (cp > 0) parts.push(`${cp} CP`)
        
        const result = parts.length > 0 ? parts.join(' ') : '0 GP'
        return isNegative ? `-${result}` : result
    }

    const calculations = useMemo(() => {
        const attendingCount = session.attendingCharacters.length
        if (attendingCount === 0) return null

        const totalValue = loot.reduce((sum, item) => {
            const baseVal = item.isGood ? item.valueGP : item.valueGP / 2
            const itemTotal = item.isPerCharacter ? baseVal * attendingCount : baseVal
            return sum + itemTotal
        }, 0)

        const sharePerPlayer = totalValue / attendingCount

        const userClaimedValue = loot
            .filter(item => item.claimedBy && userCharacterIds.has(item.claimedBy))
            .reduce((sum, item) => {
                const val = item.isGood ? item.valueGP : item.valueGP / 2
                return sum + val
            }, 0)

        const userFinalShare = sharePerPlayer - userClaimedValue
        const guildmasterCutValue = Math.round(totalValue * 0.2 * 100) / 100

        return {
            totalValue,
            sharePerPlayer,
            userFinalShare,
            userClaimedValue,
            guildmasterCutValue,
        }
    }, [loot, session.attendingCharacters.length, userCharacterIds])

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                    <Coins className="text-primary h-5 w-5" />
                    Loot
                </h3>
                {session.canManage && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={resetForm} className="h-8 gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                Add Loot
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Loot</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Item Name</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hide Shield" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Link (Optional)</label>
                                    <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Value in GP</label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={valueGP} 
                                            onChange={(e) => setValueGP(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Quantity</label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={quantity} 
                                            onChange={(e) => setQuantity(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="isGood" checked={isGood} onCheckedChange={(val) => setIsGood(!!val)} />
                                        <label htmlFor="isGood" className="text-sm font-medium cursor-pointer">
                                            Is &quot;Good&quot; (Trade good - unclaimable, full resale value)
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="isPerCharacter" checked={isPerCharacter} onCheckedChange={(val) => setIsPerCharacter(!!val)} />
                                        <label htmlFor="isPerCharacter" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                                            For <span className="font-bold underline text-primary">EACH</span> character
                                            <span className="text-xs text-muted-foreground font-normal">(Added to every player&apos;s share)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAdd}>Add Loot Item(s)</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Guildmaster Cut Banner if assigned */}
            {session.guildmasterCutCharacterData && calculations && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                            <span className="text-muted-foreground">Regional Guildmaster: </span>
                            <strong className="text-amber-300 font-semibold">{session.guildmasterCutCharacterData.name}</strong>
                            <span className="text-muted-foreground text-[11px] ml-1.5">(Lvl {session.guildmasterCutCharacterData.lvl})</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-muted-foreground text-[11px]">20% Compensation:</span>
                        <strong className="text-amber-300 font-bold">+{formatGP(calculations.guildmasterCutValue)}</strong>
                    </div>
                </div>
            )}

            {userCharacterInSession && calculations && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-1">Your Share</div>
                        <div className="text-2xl font-black text-primary">
                            {formatGP(calculations.userFinalShare)}
                        </div>

                        {loot.filter(item => item.claimedBy && userCharacterIds.has(item.claimedBy)).length > 0 && (
                            <div className="my-2.5 text-xs text-muted-foreground space-y-1">
                                {loot
                                    .filter(item => item.claimedBy && userCharacterIds.has(item.claimedBy))
                                    .map((item) => {
                                        const val = item.isGood ? item.valueGP : item.valueGP / 2
                                        return (
                                            <div key={item.id}>
                                                - {item.name} (worth {formatGP(val)})
                                            </div>
                                        )
                                    })}
                            </div>
                        )}

                        <div className="text-[10px] text-muted-foreground mt-2 italic">
                            Based on {formatGP(calculations.sharePerPlayer)} share minus {formatGP(calculations.userClaimedValue)} in claimed items.
                        </div>
                    </CardContent>
                </Card>
            )}

            {loot.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                        No loot recorded for this session yet.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {loot.map((item) => {
                        const claimedCharacter = session.attendingCharacters.find(c => c._id === item.claimedBy)
                        const isClaimedByMe = item.claimedBy && userCharacterIds.has(item.claimedBy)
                        const resaleValue = item.isGood ? item.valueGP : item.valueGP / 2
                        const totalItemValue = item.isPerCharacter 
                            ? resaleValue * (session.attendingCharacters.length || 1) 
                            : resaleValue

                        return (
                            <Card key={item.id} className="bg-card/50 overflow-hidden border-border/40">
                                <div className="p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-sm truncate">
                                                {item.link ? (
                                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 text-primary">
                                                        {item.name}
                                                        <LinkIcon className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    item.name
                                                )}
                                            </h4>
                                            {item.isPerCharacter && (
                                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    For EACH Character
                                                </span>
                                            )}
                                            {item.isGood ? (
                                                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Good (Unclaimable)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">Used</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                            {item.isPerCharacter ? (
                                                <>
                                                    <span>Value: {formatGP(item.valueGP)} / player</span>
                                                    <span className="opacity-50">|</span>
                                                    <span>Total: {formatGP(totalItemValue)}</span>
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

                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.claimedBy ? (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border/40">
                                                <User className={cn("h-3 w-3", isClaimedByMe ? "text-primary" : "text-muted-foreground")} />
                                                <span className={cn("text-[10px] font-bold truncate max-w-[80px]", isClaimedByMe ? "text-primary" : "text-muted-foreground")}>
                                                    {isClaimedByMe ? 'You' : (claimedCharacter?.name || 'Claimed')}
                                                </span>
                                                {(isClaimedByMe || session.canManage) && (
                                                    <button 
                                                        onClick={() => handleUnclaim(item.id)}
                                                        className="hover:text-destructive transition-colors ml-0.5"
                                                        title="Unclaim"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : !item.isGood && userCharacterInSession ? (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-7 text-[10px] font-bold px-2 gap-1"
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
                                                    className="h-7 w-7" 
                                                    onClick={() => {
                                                        setEditingItem(item)
                                                        setName(item.name)
                                                        setLink(item.link || '')
                                                        setValueGP(item.valueGP.toString())
                                                        setIsGood(item.isGood)
                                                        setIsPerCharacter(!!item.isPerCharacter)
                                                    }}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive hover:text-destructive" 
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

            {editingItem && (
                <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Loot</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Name</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Link (Optional)</label>
                                <Input value={link} onChange={(e) => setLink(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Value in GP</label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={valueGP} 
                                    onChange={(e) => setValueGP(e.target.value)} 
                                
                                />
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="isGoodEdit" checked={isGood} onCheckedChange={(val) => setIsGood(!!val)} />
                                    <label htmlFor="isGoodEdit" className="text-sm font-medium cursor-pointer">
                                        Is &quot;Good&quot; (Trade good - unclaimable, full resale value)
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="isPerCharacterEdit" checked={isPerCharacter} onCheckedChange={(val) => setIsPerCharacter(!!val)} />
                                    <label htmlFor="isPerCharacterEdit" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                                        For <span className="font-bold underline text-primary">EACH</span> character
                                        <span className="text-xs text-muted-foreground font-normal">(Added to every player&apos;s share)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleEdit}>Update Loot Item</Button>
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
                                className="h-8 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
                            >
                                <Crown className="h-3.5 w-3.5 text-amber-400" />
                                {session.guildmasterCutCharacterData ? 'Edit Guildmaster' : 'Assign Guildmaster'}
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
                                        className="text-muted-foreground hover:text-destructive mr-auto"
                                    >
                                        Remove
                                    </Button>
                                )}
                                <Button onClick={() => handleSetGuildmaster(selectedGmId)}>
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
