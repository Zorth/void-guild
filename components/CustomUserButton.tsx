'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Trophy } from 'lucide-react'
import AchievementsModal from '@/components/AchievementsModal'

export default function CustomUserButton() {
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)

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
        </UserButton.MenuItems>
      </UserButton>

      <AchievementsModal
        open={isAchievementsOpen}
        onOpenChange={setIsAchievementsOpen}
      />
    </>
  )
}
