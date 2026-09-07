/**
 * Black Void Auction House - 2 Significant Figures & Auto-Bid Utilities
 *
 * Rules:
 * 1. Only whole positive GP numbers (no decimals).
 * 2. Always rounded to 2 significant figures:
 *    - 1..99 GP => exact integer (step 1 GP)
 *    - 100..999 GP => rounded to nearest 10 GP (step 10 GP)
 *    - 1,000..9,999 GP => rounded to nearest 100 GP (step 100 GP)
 *    - 10,000+ GP => rounded to nearest 1,000 GP, etc.
 */

export function roundToTwoSigFigs(n: number): number {
  if (n <= 0) return 0
  const intVal = Math.round(n)
  if (intVal < 100) return intVal
  const digits = Math.floor(Math.log10(intVal)) + 1
  const scale = Math.pow(10, digits - 2)
  return Math.round(intVal / scale) * scale
}

export function getNextValidBid(currentBid: number): number {
  if (currentBid <= 0) return 1
  if (currentBid < 99) return currentBid + 1
  if (currentBid < 100) return 100
  const digits = Math.floor(Math.log10(currentBid)) + 1
  const step = Math.pow(10, digits - 2)
  const target = currentBid + step
  return roundToTwoSigFigs(target)
}

export function isValidTwoSigFig(n: number): boolean {
  return Number.isInteger(n) && n > 0 && roundToTwoSigFigs(n) === n
}
