import { NextRequest, NextResponse } from 'next/server'

interface AoNHit {
  _id: string
  _source: {
    id?: string
    name: string
    category?: string
    url?: string
    price?: number
    price_raw?: string
    item_category?: string
    item_subcategory?: string
    level?: number
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const baseName = query
      .replace(/^\+\d+\s+/, '')
      .replace(/^(striking|resilient|greater|major|lesser|minor)\s+/i, '')
      .trim()

    const res = await fetch('https://elasticsearch.aonprd.com/aon/_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          bool: {
            should: [
              { match: { name: { query, boost: 3 } } },
              { prefix: { name: { value: query.toLowerCase(), boost: 2 } } },
              { match: { name: { query: baseName, fuzziness: 'AUTO' } } },
            ],
            minimum_should_match: 1,
          },
        },
        size: 10,
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Nethys search failed: ${res.statusText}` }, { status: 502 })
    }

    const data = await res.json()
    const hits: AoNHit[] = data.hits?.hits || []

    const results = hits.map((hit) => {
      const src = hit._source
      const fullUrl = src.url ? `https://2e.aonprd.com${src.url}` : undefined
      let priceInGP = 0

      if (typeof src.price === 'number') {
        priceInGP = Math.round((src.price / 100) * 100) / 100
      }

      return {
        id: hit._id,
        name: src.name,
        url: fullUrl,
        priceInGP,
        priceRaw: src.price_raw,
        level: src.level,
        category: src.item_category || src.category,
      }
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Error fetching items from Archives of Nethys:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
