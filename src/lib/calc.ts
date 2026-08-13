import type { CalcResult, Gender, PlayerResult, Rounding, SessionInput } from './types'

export function roundAmount(raw: number, rounding: Rounding): number {
  return rounding === 'up1000' ? Math.ceil(raw / 1000) * 1000 : Math.round(raw)
}

export function shuttleTotal(input: SessionInput): number {
  return input.shuttleCount * input.shuttlePrice
}

function ratioOf(input: SessionInput, gender: Gender): number {
  return gender === 'male' ? input.maleRatio : input.femaleRatio
}

interface Share {
  courtShare: number
  shuttleShare: number
  hours: number | null
}

function buildResult(input: SessionInput, shares: Share[], emptyHours: number): CalcResult {
  const totalCost = shuttleTotal(input) + input.courtFee
  const players: PlayerResult[] = input.players.map((p, i) => {
    const raw = shares[i].courtShare + shares[i].shuttleShare
    return {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      halfSession: p.halfSession,
      hours: shares[i].hours,
      courtShare: shares[i].courtShare,
      shuttleShare: shares[i].shuttleShare,
      raw,
      amount: roundAmount(raw, input.rounding),
    }
  })
  const totalCollected = players.reduce((s, p) => s + p.amount, 0)
  return { totalCost, totalCollected, surplus: totalCollected - totalCost, emptyHours, players }
}

export function calcRatioMode(input: SessionInput): CalcResult {
  const parts = input.players.map(
    (p) => ratioOf(input, p.gender) * (p.halfSession ? 0.5 : 1),
  )
  const totalParts = parts.reduce((a, b) => a + b, 0)
  const shuttle = shuttleTotal(input)
  const shares: Share[] = input.players.map((_, i) => ({
    courtShare: totalParts > 0 ? (input.courtFee * parts[i]) / totalParts : 0,
    shuttleShare: totalParts > 0 ? (shuttle * parts[i]) / totalParts : 0,
    hours: null,
  }))
  return buildResult(input, shares, 0)
}
