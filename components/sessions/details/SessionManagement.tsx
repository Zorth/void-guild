'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Pencil, CheckCircle2, Shield } from 'lucide-react'
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
import { getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { Doc } from '@/convex/_generated/dataModel'

interface SessionManagementProps {
  session: any // Using any for simplicity as it includes combined GM data
  isAdmin: boolean
  onSendToDiscord: () => void
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
        <Button variant="outline" className="w-full justify-start" onClick={onSendToDiscord}>
            <img src="/discord-icon.svg" alt="Discord" className="mr-2 h-4 w-4" />
            Announce on Discord
        </Button>
        
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
