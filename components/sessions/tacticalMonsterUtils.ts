/**
 * Tactical Monster Utilities for Pathfinder 2e encounter management
 * Handles Weak / Elite adjustments, HP calculations, and monster naming/numbering.
 */

export type MonsterAdjustment = 'normal' | 'weak' | 'elite'

/**
 * Returns HP adjustment delta according to PF2e Creature Adjustment rules:
 * - Elite:
 *   Starting Level <= 1: +10 HP
 *   Starting Level 2-4:  +15 HP
 *   Starting Level 5-19: +20 HP
 *   Starting Level 20+:  +30 HP
 * - Weak:
 *   Starting Level <= 2: -10 HP (minimum 1 HP)
 *   Starting Level 3-5:  -15 HP
 *   Starting Level 6-20: -20 HP
 *   Starting Level 21+:  -30 HP
 */
export function getHpAdjustment(baseLevel: number, adjustment: 'weak' | 'elite'): number {
  if (adjustment === 'elite') {
    if (baseLevel <= 1) return 10
    if (baseLevel <= 4) return 15
    if (baseLevel <= 19) return 20
    return 30
  }
  if (adjustment === 'weak') {
    if (baseLevel <= 2) return 10
    if (baseLevel <= 5) return 15
    if (baseLevel <= 20) return 20
    return 30
  }
  return 0
}

/**
 * Calculates adjusted HP, AC, and Level given base stats and chosen adjustment.
 */
export function calculateAdjustedStats(
  baseHp: number,
  baseAc: number,
  baseLevel: number,
  adjustment: MonsterAdjustment
): { hp: number; ac: number; level: number } {
  if (adjustment === 'elite') {
    return {
      hp: baseHp + getHpAdjustment(baseLevel, 'elite'),
      ac: baseAc + 2,
      level: baseLevel + 1,
    }
  }
  if (adjustment === 'weak') {
    return {
      hp: Math.max(1, baseHp - getHpAdjustment(baseLevel, 'weak')),
      ac: baseAc - 2,
      level: baseLevel - 1,
    }
  }
  return {
    hp: baseHp,
    ac: baseAc,
    level: baseLevel,
  }
}

/**
 * Strips copy annotations and trailing numbers to find the base name of a monster.
 * e.g. "Goblin Warrior 2" -> "Goblin Warrior"
 * e.g. "Goblin Warrior (Copy)" -> "Goblin Warrior"
 */
export function getMonsterBaseName(rawName: string): string {
  const clean = rawName.replace(/\s*\(\s*copy(?:\s*\d+)?\s*\)/gi, '').trim()
  const match = clean.match(/^(.*?)\s+\d+$/)
  if (match && match[1]?.trim()) {
    return match[1].trim()
  }
  return clean || 'Monster'
}

/**
 * Finds the next sequential number for a monster name in the encounter,
 * ensuring all monsters are cleanly numbered and avoiding "(Copy)".
 */
export function getNextNumberedMonsterName(
  rawName: string,
  existingMonsters: { name: string; id?: string }[],
  excludeMonsterId?: string
): string {
  const cleanRawName = rawName.replace(/\s*\(\s*copy(?:\s*\d+)?\s*\)/gi, '').trim()
  const baseName = getMonsterBaseName(cleanRawName)
  const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedBase}(?:\\s+(\\d+))?$`, 'i')

  const usedNumbers = new Set<number>()
  let highestNum = 0

  existingMonsters.forEach((m) => {
    if (excludeMonsterId && m.id === excludeMonsterId) return
    const cleanMName = m.name.replace(/\s*\(\s*copy(?:\s*\d+)?\s*\)/gi, '').trim()
    const match = cleanMName.match(regex)
    if (match) {
      if (match[1]) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num)) {
          usedNumbers.add(num)
          if (num > highestNum) highestNum = num
        }
      } else {
        usedNumbers.add(1)
        if (highestNum < 1) highestNum = 1
      }
    }
  })

  // If the user provided an explicit number that isn't taken, respect it
  const explicitMatch = cleanRawName.match(/^(.*?)\s+(\d+)$/)
  if (explicitMatch && explicitMatch[1]?.trim() === baseName) {
    const desiredNum = parseInt(explicitMatch[2], 10)
    if (!isNaN(desiredNum) && !usedNumbers.has(desiredNum)) {
      return `${baseName} ${desiredNum}`
    }
  }

  const nextNum = usedNumbers.size > 0 ? highestNum + 1 : 1
  return `${baseName} ${nextNum}`
}
