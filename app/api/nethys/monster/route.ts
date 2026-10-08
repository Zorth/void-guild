import { NextRequest, NextResponse } from 'next/server'

interface AoNHit {
  _id: string
  _source: {
    id?: string
    name: string
    category?: string
    url?: string
    hp?: number | string
    hp_raw?: string
    ac?: number
    level?: number
    immunity?: any
    resistance_raw?: string
    resistance?: any
    weakness_raw?: string
    weakness?: any
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const urlParam = searchParams.get('url')?.trim()

  if (!query && !urlParam) {
    return NextResponse.json({ error: 'Missing query or url parameter' }, { status: 400 })
  }

  try {
    let esQuery: any = null

    if (urlParam) {
      // Check if it has an ID, e.g. Monsters.aspx?ID=3056 or NPCs.aspx?ID=123
      const idMatch = urlParam.match(/(?:ID|id)=(\d+)/i)
      const pathMatch = urlParam.match(/\/(Monsters|NPCs|Familiars)\.aspx/i)

      if (idMatch) {
        const idNum = idMatch[1]
        // Could be creature-<idNum> or npc-<idNum>
        esQuery = {
          bool: {
            should: [
              { term: { _id: `creature-${idNum}` } },
              { term: { _id: `npc-${idNum}` } },
              { term: { url: `/Monsters.aspx?ID=${idNum}` } },
              { term: { url: `/NPCs.aspx?ID=${idNum}` } },
            ],
            minimum_should_match: 1,
          },
        }
      } else {
        // Fallback to searching the url term
        esQuery = {
          term: { url: urlParam },
        }
      }
    } else if (query) {
      // Search by creature name
      esQuery = {
        bool: {
          must: [
            { term: { category: 'creature' } },
            {
              match: {
                name: {
                  query,
                  fuzziness: 'AUTO',
                },
              },
            },
          ],
        },
      }
    }

    const res = await fetch('https://elasticsearch.aonprd.com/aon/_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: esQuery,
        size: urlParam ? 1 : 10,
      }),
      // Don't cache stale lookups indefinitely, cache 1 hour
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Nethys search failed: ${res.statusText}` }, { status: 502 })
    }

    const data = await res.json()
    const hits: AoNHit[] = data.hits?.hits || []

    const results = hits.map((hit) => {
      const src = hit._source
      const rawHp = src.hp ?? src.hp_raw
      const hp = typeof rawHp === 'number' ? rawHp : parseInt(String(rawHp || 0), 10) || 0
      const ac = typeof src.ac === 'number' ? src.ac : parseInt(String(src.ac || 0), 10) || 10
      const immunitiesList: string[] = []
      if (Array.isArray(src.immunity)) {
        src.immunity.forEach((im: any) => immunitiesList.push(String(im)))
      }

      const resistancesList: string[] = []
      if (src.resistance_raw) {
        resistancesList.push(String(src.resistance_raw))
      } else if (src.resistance && typeof src.resistance === 'object') {
        Object.entries(src.resistance).forEach(([k, v]) => {
          resistancesList.push(`${k} ${v}`)
        })
      }

      const weaknessesList: string[] = []
      if (src.weakness_raw) {
        weaknessesList.push(String(src.weakness_raw))
      } else if (src.weakness && typeof src.weakness === 'object') {
        Object.entries(src.weakness).forEach(([k, v]) => {
          weaknessesList.push(`${k} ${v}`)
        })
      }

      return {
        id: hit._id,
        name: src.name,
        hp,
        ac,
        level: src.level ?? 0,
        url: src.url ? `https://2e.aonprd.com${src.url}` : undefined,
        immunities: immunitiesList.length > 0 ? immunitiesList.join(', ') : undefined,
        resistances: resistancesList.length > 0 ? resistancesList.join(', ') : undefined,
        weaknesses: weaknessesList.length > 0 ? weaknessesList.join(', ') : undefined,
      }
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Error fetching monster from Archives of Nethys:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
