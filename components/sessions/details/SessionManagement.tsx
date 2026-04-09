'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Pencil, CheckCircle2, Shield, Send, Bell, XCircle, Scroll } from 'lucide-react'
import SessionDialog from '@/components/sessions/SessionDialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import { getLevelBadgeStyle, CharacterRankIcon, cn } from '@/lib/utils'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { useState } from 'react'

interface SessionManagementProps {
  session: any // Using any for simplicity as it includes combined GM data
  isAdmin: boolean
  quests?: Doc<'quests'>[]
  onSelectQuest: (questId?: Id<'quests'>) => void
  onSendToDiscord: (type: 'new' | 'remind' | 'cancel') => void
  onLock: () => void
  onForceLock: () => void
  xpGainsPreview?: any[]
}

export default function SessionManagement({
  session,
  isAdmin,
  quests,
  onSelectQuest,
  onSendToDiscord,
  onLock,
  onForceLock,
  xpGainsPreview
}: SessionManagementProps) {
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Scroll className="h-3 w-3" />
                Active Quest
            </h4>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border/40">
                <div className="text-sm truncate mr-2">
                    {session.quest ? (
                        <span className="font-medium text-primary">{session.quest.name}</span>
                    ) : (
                        <span className="italic text-muted-foreground">No quest selected</span>
                    )}
                </div>
                <Dialog open={isQuestDialogOpen} onOpenChange={setIsQuestDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-tight">
                            {session.quest ? "Change" : "Select"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Select Quest</DialogTitle>
                            <DialogDescription>
                                Choose a specific quest for this session to display it on Discord and the session page.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 py-4 max-h-[300px] overflow-y-auto pr-2">
                            <Button 
                                variant={!session.questId ? "secondary" : "ghost"}
                                className="justify-start font-normal"
                                onClick={() => {
                                    onSelectQuest(undefined)
                                    setIsQuestDialogOpen(false)
                                }}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                No Active Quest
                            </Button>
                            {quests?.map((quest) => (
                                <Button 
                                    key={quest._id}
                                    variant={session.questId === quest._id ? "secondary" : "ghost"}
                                    className="justify-start font-normal h-auto py-2 px-3 text-left"
                                    onClick={() => {
                                        onSelectQuest(quest._id)
                                        setIsQuestDialogOpen(false)
                                    }}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <div 
                                                className="flex items-center justify-center rounded-full h-5 w-5 text-[8px]"
                                                style={getLevelBadgeStyle(quest.level)}
                                            >
                                                {quest.level > 0 ? quest.level : '?'}
                                            </div>
                                            {quest.name}
                                        </div>
                                        {quest.description && (
                                            <div className="text-[10px] text-muted-foreground italic line-clamp-1">
                                                {quest.description}
                                            </div>
                                        )}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <div className="space-y-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                        <img src="/discord-icon.svg" alt="Discord" className="mr-2 h-4 w-4" />
                        Post Message
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Discord Notification</DialogTitle>
                        <DialogDescription>
                            Choose the type of notification you want to send to the community.
                        </DialogDescription>
                    </DialogHeader>
                <div className="grid grid-cols-1 gap-6 py-4">
                    <div className="space-y-2">
                        <Button 
                            onClick={() => onSendToDiscord('new')} 
                            className="w-full justify-start gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white border-none"
                        >
                            <Send className="h-4 w-4" />
                            <span className="font-bold">New Session Alert</span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground px-1">
                            Announce this session for the first time to the community.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Button 
                            onClick={() => onSendToDiscord('remind')} 
                            variant="outline"
                            className="w-full justify-start gap-2 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            disabled={!session.date}
                        >
                            <Bell className="h-4 w-4" />
                            <span className="font-bold">Send Reminder</span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground px-1">
                            Remind players of available spots and time left before start. {!session.date && "(Requires a date)"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Button 
                            variant="destructive" 
                            onClick={() => onSendToDiscord('cancel')} 
                            className="w-full justify-start gap-2"
                            disabled={!session.date}
                        >
                            <XCircle className="h-4 w-4" />
                            <span className="font-bold">Cancel Session</span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground px-1">
                            Notify everyone that the session is cancelled and will no longer happen. {!session.date && "(Requires a date)"}
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
        
        <SessionDialog 
            session={session} 
            trigger={
                <Button variant="outline" className="w-full justify-start">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Session
                </Button>
            }
            hasWorld={true}
        />

        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="default" className="w-full justify-start" disabled={session.planning}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    End Session
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm End of Session</AlertDialogTitle>
                    <AlertDialogDescription>
                        The following characters will be awarded XP and potentially level up based on the session level ({session.level ?? 'Level TBD'}).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4 max-h-[400px] overflow-auto">
                    <div className="grid grid-cols-3 font-bold text-sm border-b pb-2">
                        <span>Character</span>
                        <span className="text-center">XP Gain</span>
                        <span className="text-right">New Level</span>
                    </div>
                    {xpGainsPreview?.map((p) => (
                        <div key={p.id} className="grid grid-cols-3 text-sm items-center py-2 border-b last:border-0">
                            <div className="flex flex-col">
                                <span className="font-semibold">{p.name}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <CharacterRankIcon rank={p.rank} />
                                    <span 
                                        className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                                        style={getLevelBadgeStyle(p.currentLvl)}
                                    >
                                        Lvl {p.currentLvl}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">({p.currentXp} XP)</span>
                                </div>
                                {p.isGMCharacter && <span className="text-[10px] text-primary flex items-center gap-1"><Shield className="h-2 w-2"/> GM</span>}
                            </div>
                            <div className="text-center font-mono text-green-600">
                                +{p.xpGain}
                            </div>
                            <div className="text-right">
                                {p.newLvl > p.currentLvl ? (
                                    <div className="flex flex-col items-end">
                                        <span 
                                            className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold border-2 border-green-500 bg-green-100 text-green-700 whitespace-nowrap"
                                        >
                                            Lvl {p.newLvl} ↑
                                        </span>
                                        <div className="text-[10px] text-muted-foreground">({p.newXp} XP)</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span 
                                            className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                                            style={getLevelBadgeStyle(p.newLvl)}
                                        >
                                            Lvl {p.newLvl}
                                        </span>
                                        <div className="text-[10px] text-muted-foreground">({p.newXp} XP)</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <AlertDialogFooter className="flex-wrap justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onLock} disabled={session.level === undefined}>Confirm & Award XP</AlertDialogAction>
                    {isAdmin && (
                        <AlertDialogAction onClick={onForceLock} variant="destructive">
                            Force Close (No XP)
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
