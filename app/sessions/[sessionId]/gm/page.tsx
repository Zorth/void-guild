import { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import TacticalClient from './TacticalClient'

type Props = {
  params: Promise<{ sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params

  try {
    const session = await fetchQuery(api.sessions.getSession, { sessionId })
    if (!session) {
      return { title: 'Session Not Found | Void Guild' }
    }

    return {
      title: `Tactical View - ${session.worldName} | Void Guild`,
      description: `Tactical GM initiative and encounter tracker for ${session.worldName}`,
    }
  } catch {
    return { title: 'Tactical View | Void Guild' }
  }
}

export default async function TacticalPage({ params }: Props) {
  const { sessionId } = await params
  return <TacticalClient sessionId={sessionId} />
}
