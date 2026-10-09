import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    const cleanId = idParam ? String(idParam).trim().replace(/[^0-9]/g, '') : ''

    if (!cleanId) {
      return NextResponse.json(
        { error: 'Missing or invalid Pathbuilder ID. Please provide a numeric ID.' },
        { status: 400 }
      )
    }

    let stdout = ''
    try {
      const res = await execFileAsync(
        'curl',
        [
          '-s',
          '-L',
          '--max-time',
          '15',
          '-A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          `https://pathbuilder2e.com/json.php?id=${cleanId}`,
        ],
        { maxBuffer: 10 * 1024 * 1024 }
      )
      stdout = res.stdout
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Failed to contact Pathbuilder servers: ' + (err.message || String(err)) },
        { status: 502 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(stdout)
    } catch {
      if (stdout.includes('Cloudflare') || stdout.includes('Just a moment')) {
        return NextResponse.json(
          { error: 'Pathbuilder request was blocked by Cloudflare verification.' },
          { status: 502 }
        )
      }
      return NextResponse.json(
        { error: 'Invalid response received from Pathbuilder servers.' },
        { status: 502 }
      )
    }

    if (!parsed || parsed.success === false || !parsed.build) {
      return NextResponse.json(
        { error: parsed?.error || 'Pathbuilder build not found or export ID does not exist.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      build: parsed.build,
    })
  } catch (error: any) {
    console.error('Error fetching Pathbuilder JSON:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error while fetching Pathbuilder export.' },
      { status: 500 }
    )
  }
}
