'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Trophy, Key } from 'lucide-react'
import AchievementsModal from '@/components/AchievementsModal'
import { ApiKeyDialog } from '@/components/ApiKeyDialog'

export default function CustomUserButton() {
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false)

  return (
    <>
      <UserButton
        appearance={{
          elements: {
            footer: 'hidden',
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Action
            label="Achievements"
            labelIcon={<Trophy className="h-4 w-4 text-amber-500" />}
            onClick={() => setIsAchievementsOpen(true)}
          />
          <UserButton.Action
            label="API Access Key"
            labelIcon={<Key className="h-4 w-4 text-amber-400" />}
            onClick={() => setIsApiDialogOpen(true)}
          />
        </UserButton.MenuItems>
      </UserButton>

      <AchievementsModal
        open={isAchievementsOpen}
        onOpenChange={setIsAchievementsOpen}
      />

      <ApiKeyDialog
        open={isApiDialogOpen}
        onOpenChange={setIsApiDialogOpen}
      />
    </>
  )
}
