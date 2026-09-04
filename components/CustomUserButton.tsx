'use client'

import { UserButton } from '@clerk/nextjs'
import { Trophy } from 'lucide-react'

export default function CustomUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          footer: 'hidden',
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Achievements"
          labelIcon={<Trophy className="h-4 w-4 text-amber-500" />}
          href="/stats"
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
