import { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import SessionClient from './SessionClient'

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

    const date = new Date(session.date)
    const formattedDate = date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
    const formattedTime = date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    const title = `${session.worldName} | ${session.system === 'PF' ? 'Pathfinder' : 'D&D 5e'}`
    const description = `📅 ${formattedDate} at ${formattedTime}\n👥 Players: ${session.attendingCharacters.length}/${session.maxPlayers}\n⚔️ Level: ${session.level ?? 'TBD'}`

    const imagePath = session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: [
          {
            url: imagePath,
            width: 400,
            height: 400,
            alt: session.system || 'Session Icon',
          },
        ],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [imagePath],
      },
    }
  } catch (error) {
    console.error('Metadata generation error:', error)
    return { title: 'Session Details | Void Guild' }
  }
}

export default async function Page({ params }: Props) {
  return <SessionClient />
}
