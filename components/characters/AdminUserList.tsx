'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, User, Settings2, Save, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Authenticated } from 'convex/react'

export default function AdminUserList() {
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const users = useQuery(api.users.listUsers, !!isAdmin ? undefined : "skip")
  const updateUser = useMutation(api.users.updateUser)

  if (!isAdmin) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5" title="Manage Users">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Manage Users
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-6 pt-2 space-y-4 custom-scrollbar">
          {users === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 italic">No users found.</p>
          ) : (
            <div className="grid gap-3">
              {users.map((user) => (
                <UserEditDialog key={user._id} user={user} onUpdate={updateUser} />
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-muted/30 flex justify-end">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UserEditDialog({ user, onUpdate }: { user: any; onUpdate: any }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    username: user.username || '',
    isAdmin: user.isAdmin || false,
    isGM: user.isGM || false,
    extraSessionsPlayed: user.extraSessionsPlayed || 0,
    extraSessionsRan: user.extraSessionsRan || 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate({
        userId: user.userId,
        ...formData,
      })
      toast.success(`User ${formData.name || user.userId} updated`)
    } catch (error) {
      toast.error('Failed to update user')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-primary/10 p-2 rounded-full shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{user.name || 'Unnamed User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email || user.userId}</p>
            <div className="flex gap-2 mt-1">
              {user.isAdmin && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase font-black">Admin</span>}
              {user.isGM && <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase font-black">GM</span>}
            </div>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User: {user.name || user.userId}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Username</label>
                <Input 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-blue-500">Extra Played</label>
                  <Input 
                    type="number"
                    value={formData.extraSessionsPlayed} 
                    onChange={(e) => setFormData({ ...formData, extraSessionsPlayed: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-amber-500">Extra Ran</label>
                  <Input 
                    type="number"
                    value={formData.extraSessionsRan} 
                    onChange={(e) => setFormData({ ...formData, extraSessionsRan: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`isGM-${user._id}`} 
                    checked={formData.isGM} 
                    onCheckedChange={(checked) => setFormData({ ...formData, isGM: !!checked })}
                  />
                  <label htmlFor={`isGM-${user._id}`} className="text-sm font-bold cursor-pointer">Game Master</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`isAdmin-${user._id}`} 
                    checked={formData.isAdmin} 
                    onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: !!checked })}
                  />
                  <label htmlFor={`isAdmin-${user._id}`} className="text-sm font-bold cursor-pointer text-red-500">Admin</label>
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
