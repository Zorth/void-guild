'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Pencil, CheckCircle2, Shield, Send, Bell, XCircle, Scroll, Calendar, CalendarRange, Clock, Unlock } from 'lucide-react'
import SessionDialog from '@/components/sessions/SessionDialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { getLevelBadgeStyle, CharacterRankIcon, cn, formatInGameYear } from '@/lib/utils'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { useState, useMemo } from 'react'

interface SessionManagementProps {
  session: any // Using any for simplicity as it includes combined GM data
  isAdmin: boolean
  quests?: Doc<'quests'>[]
  currentWorldDate?: { year: number, month: number, day: number }
  worldCalendar?: string
  onSelectQuest: (questId?: Id<'quests'>) => void
  onUpdateInGameDate: (inGameDate?: any) => void
  onSendToDiscord: (type: 'new' | 'remind' | 'cancel') => void
  onLock: () => void
  onForceLock: () => void
  onUnlock: () => void
  onForceUnlock: () => void
  xpGainsPreview?: any[]
}

export default function SessionManagement({
  session,
  isAdmin,
  quests,
  currentWorldDate,
  worldCalendar,
  onSelectQuest,
  onUpdateInGameDate,
  onSendToDiscord,
  onLock,
  onForceLock,
  onUnlock,
  onForceUnlock,
  xpGainsPreview
}: SessionManagementProps) {
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false)
  const [isInGameDateDialogOpen, setIsInGameDateDialogOpen] = useState(false)

  const { eras, yearZeroExists } = useMemo(() => {
    if (!worldCalendar) return { eras: [], yearZeroExists: false }
    try {
      const parsed = JSON.parse(worldCalendar)
      return {
        eras: parsed.static_data?.eras || parsed.static?.eras || [],
        yearZeroExists: parsed.static_data?.settings?.year_zero_exists || parsed.static?.settings?.year_zero_exists || false
      }
    } catch (e) {
      return { eras: [], yearZeroExists: false }
    }
  }, [worldCalendar])

  // In-game date editing state
  const [tempDate, setTempDate] = useState({
    year: session.inGameDate?.year ?? currentWorldDate?.year ?? 1,
    month: session.inGameDate?.month ?? currentWorldDate?.month ?? 0,
    day: session.inGameDate?.day ?? currentWorldDate?.day ?? 1,
    era: session.inGameDate?.era ?? '',
    hasEnd: !!session.inGameDate?.endDay,
    endYear: session.inGameDate?.endYear ?? session.inGameDate?.year ?? currentWorldDate?.year ?? 1,
    endMonth: session.inGameDate?.endMonth ?? session.inGameDate?.month ?? currentWorldDate?.month ?? 0,
    endDay: session.inGameDate?.endDay ?? session.inGameDate?.day ?? currentWorldDate?.day ?? 1,
  })

  const handleSaveInGameDate = () => {
    onUpdateInGameDate({
        year: tempDate.year,
        month: tempDate.month,
        day: tempDate.day,
        era: tempDate.era || undefined,
        endYear: tempDate.hasEnd ? tempDate.endYear : undefined,
        endMonth: tempDate.hasEnd ? tempDate.endMonth : undefined,
        endDay: tempDate.hasEnd ? tempDate.endDay : undefined,
    })
    setIsInGameDateDialogOpen(false)
  }

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
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-tight" disabled={session.locked}>
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
                                                {(quest.level ?? 0) > 0 ? quest.level : '?'}
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                In-Game Date
            </h4>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border/40">
                <div className="text-sm truncate mr-2">
                    {session.inGameDate ? (
                        <div className="flex flex-col">
                            <span className="font-medium text-primary">
                                {session.inGameDate.era 
                                    ? `${session.inGameDate.year}/${String(session.inGameDate.month + 1).padStart(2, '0')}/${String(session.inGameDate.day).padStart(2, '0')} ${session.inGameDate.era}`
                                    : `${formatInGameYear(session.inGameDate.year, eras, yearZeroExists)}/${String(session.inGameDate.month + 1).padStart(2, '0')}/${String(session.inGameDate.day).padStart(2, '0')}`
                                }
                            </span>
                            {session.inGameDate.endDay && (
                                <span className="text-[10px] text-muted-foreground">
                                    to {session.inGameDate.era 
                                        ? `${session.inGameDate.endYear ?? session.inGameDate.year}/${String(session.inGameDate.endMonth! + 1).padStart(2, '0')}/${String(session.inGameDate.endDay).padStart(2, '0')} ${session.inGameDate.era}`
                                        : `${formatInGameYear(session.inGameDate.endYear ?? session.inGameDate.year, eras, yearZeroExists)}/${String(session.inGameDate.endMonth! + 1).padStart(2, '0')}/${String(session.inGameDate.endDay).padStart(2, '0')}`
                                    }
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="italic text-muted-foreground">No date set</span>
                    )}
                </div>
                <Dialog open={isInGameDateDialogOpen} onOpenChange={setIsInGameDateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-tight" disabled={session.locked}>
                            {session.inGameDate ? "Edit" : "Set"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Set In-Game Date</DialogTitle>
                            <DialogDescription>
                                Specify when this session takes place in your world's timeline.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-1">
                                    <Clock className="h-3 w-3" /> Start Date
                                </h5>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase ml-1">Day</label>
                                        <Input type="number" className="h-8 text-xs" value={tempDate.day} onChange={e => setTempDate({...tempDate, day: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase ml-1">Month</label>
                                        <Input type="number" className="h-8 text-xs" value={tempDate.month + 1} onChange={e => setTempDate({...tempDate, month: parseInt(e.target.value) - 1})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase ml-1">Year</label>
                                        <Input type="number" className="h-8 text-xs" value={tempDate.year} onChange={e => setTempDate({...tempDate, year: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase ml-1">Era</label>
                                        <Input type="text" className="h-8 text-xs" placeholder="e.g. 2E" value={tempDate.era} onChange={e => setTempDate({...tempDate, era: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="has-end-date" 
                                        checked={tempDate.hasEnd} 
                                        onCheckedChange={(checked) => setTempDate({...tempDate, hasEnd: !!checked})} 
                                    />
                                    <label htmlFor="has-end-date" className="text-sm font-medium leading-none cursor-pointer">
                                        Span multiple days?
                                    </label>
                                </div>

                                {tempDate.hasEnd && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-1">
                                            <CalendarRange className="h-3 w-3" /> End Date
                                        </h5>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold uppercase ml-1">Day</label>
                                                <Input type="number" className="h-8 text-xs" value={tempDate.endDay} onChange={e => setTempDate({...tempDate, endDay: parseInt(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold uppercase ml-1">Month</label>
                                                <Input type="number" className="h-8 text-xs" value={tempDate.endMonth + 1} onChange={e => setTempDate({...tempDate, endMonth: parseInt(e.target.value) - 1})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold uppercase ml-1">Year</label>
                                                <Input type="number" className="h-8 text-xs" value={tempDate.endYear} onChange={e => setTempDate({...tempDate, endYear: parseInt(e.target.value)})} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onUpdateInGameDate(undefined)}>
                                Clear Date
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsInGameDateDialogOpen(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleSaveInGameDate}>Save Date</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <div className="space-y-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" disabled={session.locked}>
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
                <Button variant="outline" className="w-full justify-start" disabled={session.locked}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Session
                </Button>
            }
            hasWorld={true}
        />

        {!session.locked ? (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="default" className="w-full justify-start">
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
                        <AlertDialogAction onClick={onLock} disabled={session.level === undefined || session.planning}>Confirm & Award XP</AlertDialogAction>
                        {isAdmin && (
                            <AlertDialogAction onClick={onForceLock} variant="destructive">
                                Force Close (No XP)
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        ) : isAdmin && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                        <Unlock className="h-4 w-4 mr-2" />
                        Unlock Session
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to unlock the session?</AlertDialogTitle>
                        <AlertDialogDescription className="text-destructive font-bold">
                            This will undo XP given to characters in this session.
                            WARNING: This will break XP values if this isn&apos;t the latest session for these characters.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-wrap justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onUnlock} variant="destructive">
                            Unlock (Revert XP)
                        </AlertDialogAction>
                        <AlertDialogAction onClick={onForceUnlock} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Force Unlock (Keep XP)
                        </AlertDialogAction>
                    </AlertDialogFooter>                    
                </AlertDialogContent>
            </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
