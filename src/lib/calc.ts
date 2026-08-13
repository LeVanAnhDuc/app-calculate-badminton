import type { CalcResult, Gender, PlayerResult, Rounding, SessionInput } from './types'
import { durationHours, toMinutes } from './time'

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

/** Offset (hours) of time t from court start, wrapping midnight. */
function offsetFromCourtStart(t: string, courtStart: string): number {
  return (((toMinutes(t) - toMinutes(courtStart)) % 1440) + 1440) % 1440 / 60
}

export function calcHourlyMode(input: SessionInput): CalcResult {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
  const n = input.players.length

  const intervals = input.players.map((p) => {
    const s = p.startTime ?? input.courtStart
    const e = p.endTime ?? input.courtEnd
    const start = offsetFromCourtStart(s, input.courtStart)
    return [start, start + durationHours(s, e)] as [number, number]
  })
  const hours = intervals.map(([s, e]) => e - s)
  const totalHours = hours.reduce((a, b) => a + b, 0)

  // merged coverage of player intervals
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
  let covered = 0
  let curS = 0
  let curE = -1
  for (const [s, e] of sorted) {
    if (curE < 0) {
      curS = s
      curE = e
    } else if (s > curE) {
      covered += curE - curS
      curS = s
      curE = e
    } else if (e > curE) {
      curE = e
    }
  }
  if (curE >= 0) covered += curE - curS
  const emptyHours = Math.max(0, courtHours - covered)

  const unitPrice = courtHours > 0 ? input.courtFee / courtHours : 0
  const emptyFee = unitPrice * emptyHours
  const playedFee = input.courtFee - emptyFee

  const shuttle = shuttleTotal(input)
  const totalRatio = input.players.reduce((s, p) => s + ratioOf(input, p.gender), 0)

  const shares: Share[] = input.players.map((p, i) => ({
    courtShare:
      (n > 0 ? emptyFee / n : 0) +
      (totalHours > 0 ? (playedFee * hours[i]) / totalHours : n > 0 ? playedFee / n : 0),
    shuttleShare: totalRatio > 0 ? (shuttle * ratioOf(input, p.gender)) / totalRatio : 0,
    hours: hours[i],
  }))
  return buildResult(input, shares, emptyHours)
}

export function calcSession(input: SessionInput): CalcResult {
  return input.mode === 'hourly' ? calcHourlyMode(input) : calcRatioMode(input)
}

export function validateSession(input: SessionInput): string[] {
  const errors: string[] = []
  if (input.players.length === 0) errors.push('Cần ít nhất 1 người chơi')
  if (shuttleTotal(input) + input.courtFee <= 0) errors.push('Tổng chi phải lớn hơn 0')
  if (input.maleRatio <= 0 || input.femaleRatio <= 0) errors.push('Hệ số phải lớn hơn 0')
  if (input.mode === 'hourly') {
    const courtHours = durationHours(input.courtStart, input.courtEnd)
    if (courtHours <= 0) {
      errors.push('Giờ thuê sân chưa hợp lệ')
    } else {
      for (const p of input.players) {
        if ((p.startTime === null) !== (p.endTime === null)) {
          errors.push(`Giờ chơi của ${p.name} chưa đủ 2 mốc`)
          continue
        }
        if (p.startTime !== null && p.endTime !== null) {
          const off = offsetFromCourtStart(p.startTime, input.courtStart)
          const len = durationHours(p.startTime, p.endTime)
          if (off + len > courtHours + 1e-9) {
            errors.push(`Giờ chơi của ${p.name} nằm ngoài giờ thuê sân`)
          }
        }
      }
    }
  }
  return errors
}
