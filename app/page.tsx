'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

export default function Home() {
  return (
    <>
    <h1>test</h1>
      <Authenticated>
      <h2>Logged in</h2>
        <UserButton />
        <Content />
      </Authenticated>
      <Unauthenticated>
          <h2>Logged out</h2>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}

function Content() {
  const messages = useQuery(api.messages.getForCurrentUser)
  return <div>Authenticated content: {messages?.length}</div>
}

