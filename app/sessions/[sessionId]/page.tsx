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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'
    
    let dateStr = "Date TBD"
    let timeStr = "Time TBD"
    
    if (session.date) {
        const d = new Date(session.date)
        const formatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Brussels'
        })
        const parts = formatter.formatToParts(d)
        const year = parts.find(p => p.type === 'year')?.value
        const month = parts.find(p => p.type === 'month')?.value
        const day = parts.find(p => p.type === 'day')?.value
        const hour = parts.find(p => p.type === 'hour')?.value
        const minute = parts.find(p => p.type === 'minute')?.value
        
        dateStr = `${year}/${month}/${day}`
        timeStr = `${hour}:${minute}`
    }

    const title = `${session.worldName} | ${session.system === 'PF' ? 'Pathfinder' : 'D&D 5e'} ${session.planning ? '(Planning)' : ''}`
    const description = `📅 ${dateStr} at ${timeStr}\n👥 Players: ${session.attendingCharacters.length}/${session.maxPlayers}\n⚔️ Level: ${session.level ?? 'TBD'}`

    const imagePath = `${baseUrl}${session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}`

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
