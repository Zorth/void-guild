import { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import WorldClient from './WorldClient'

type Props = {
  params: Promise<{ worldname: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { worldname } = await params
  const decodedName = decodeURIComponent(worldname)
  
  try {
    const world = await fetchQuery(api.worlds.getWorldByName, { name: decodedName })
    
    if (!world) {
      return { title: 'World Not Found | Void Guild' }
    }

    const title = `${world.name} | Void Guild World`
    const description = world.description || `Explore the world of ${world.name} in the Void Guild.`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'
    const imagePath = `${baseUrl}/globe.svg`

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
            alt: world.name,
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
    return { title: 'World Details | Void Guild' }
  }
}

export default async function Page({ params }: Props) {
  return <WorldClient />
}
