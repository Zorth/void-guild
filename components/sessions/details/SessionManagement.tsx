'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Pencil, CheckCircle2, Shield, Send, Bell, XCircle } from 'lucide-react'
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
import { getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { Doc } from '@/convex/_generated/dataModel'

interface SessionManagementProps {
  session: any // Using any for simplicity as it includes combined GM data
  isAdmin: boolean
  onSendToDiscord: (type: 'new' | 'remind' | 'cancel') => void
  onLock: () => void
  onForceLock: () => void
  xpGainsPreview?: any[]
}

export default function SessionManagement({
  session,
  isAdmin,
  onSendToDiscord,
  onLock,
  onForceLock,
  xpGainsPreview
}: SessionManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
                        >
                            <Bell className="h-4 w-4" />
                            <span className="font-bold">Send Reminder</span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground px-1">
                            Remind players of available spots and time left before start.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Button 
                            variant="destructive" 
                            onClick={() => onSendToDiscord('cancel')} 
                            className="w-full justify-start gap-2"
                        >
                            <XCircle className="h-4 w-4" />
                            <span className="font-bold">Cancel Session</span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground px-1">
                            Notify everyone that the session is cancelled and will no longer happen.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        
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
                                        className="inline-flex align-middle justify-center w-12 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
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
                                            className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold border-2 border-green-500 bg-green-100 text-green-700"
                                        >
                                            Lvl {p.newLvl} ↑
                                        </span>
                                        <div className="text-[10px] text-muted-foreground">({p.newXp} XP)</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span 
                                            className="inline-flex align-middle justify-center w-12 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
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
