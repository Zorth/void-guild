import type { CalendarSession } from './calendar'

const CRLF = '\r\n'

/** Escapes TEXT values per RFC 5545 section 3.3.11. */
const escapeText = (text: string): string =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

/** Formats a timestamp as a UTC iCalendar date-time (YYYYMMDDTHHMMSSZ). */
const formatUtc = (ms: number): string =>
  new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/** Folds a content line at 75 octets, continuing with a leading space (RFC 5545 section 3.1). */
const foldLine = (line: string): string => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  // The first line may use 75 octets; continuation lines lose one octet to the leading space.
  let limit = 75
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (currentBytes + bytes > limit) {
      parts.push(current)
      current = char
      currentBytes = bytes
      limit = 74
    } else {
      current += char
      currentBytes += bytes
    }
  }
  if (current) parts.push(current)
  return parts.join(CRLF + ' ')
}

export const buildIcs = (sessions: CalendarSession[], now: number, calendarName: string): string => {
  const stamp = formatUtc(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Guild of The Void//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ]
  for (const s of sessions) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:session-${s.id}@guild.tarragon.be`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtc(s.start)}`,
      `DTEND:${formatUtc(s.end)}`,
      `SUMMARY:${escapeText(s.summary)}`,
      `DESCRIPTION:${escapeText(s.description)}`,
      `URL:${s.url}`,
      `STATUS:${s.status}`,
    )
    if (s.location) lines.push(`LOCATION:${escapeText(s.location)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join(CRLF) + CRLF
}
