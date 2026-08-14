import type { CalcResult, Gender, PlayerResult, Rounding, SessionInput } from './types'
import { durationHours, toMinutes } from './time'

export function roundAmount(raw: number, rounding: Rounding): number {
  return rounding === 'up1000' ? Math.ceil(raw / 1000) * 1000 : Math.round(raw)
}

export function shuttleTotal(input: SessionInput): number {
  return input.shuttleCount * input.shuttlePrice
}

/** Tổng các khoản phát sinh của 1 người (bỏ qua khoản mồ côi vì playerId không khớp ai). */
export function extrasOf(input: SessionInput, playerId: string): number {
  return input.extras
    .filter((e) => e.playerId === playerId)
    .reduce((s, e) => s + e.amount, 0)
}

/** Tổng mọi khoản phát sinh CÓ CHỦ trong buổi. */
export function extrasTotal(input: SessionInput): number {
  const ids = new Set(input.players.map((p) => p.id))
  return input.extras.filter((e) => ids.has(e.playerId)).reduce((s, e) => s + e.amount, 0)
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
  const totalCost = shuttleTotal(input) + input.courtFee + extrasTotal(input)
  const players: PlayerResult[] = input.players.map((p, i) => {
    const extras = extrasOf(input, p.id)
    // extras are added BEFORE rounding — rounding each part separately would
    // charge an extra "round up to 1.000đ" per extra cost
    const raw = shares[i].courtShare + shares[i].shuttleShare + extras
    return {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      halfSession: p.halfSession,
      hours: shares[i].hours,
      courtShare: shares[i].courtShare,
      shuttleShare: shares[i].shuttleShare,
      extrasTotal: extras,
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
  const emptyHoursRaw = courtHours - covered
  const emptyHours = emptyHoursRaw > 1e-6 ? emptyHoursRaw : 0

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
  if (shuttleTotal(input) + input.courtFee + extrasTotal(input) <= 0) {
    errors.push('Tổng chi phải lớn hơn 0')
  }
  if (input.maleRatio <= 0 || input.femaleRatio <= 0) errors.push('Hệ số phải lớn hơn 0')
  if (input.mode === 'hourly') {
    const HHMM = /^\d{2}:\d{2}$/
    if (!HHMM.test(input.courtStart) || !HHMM.test(input.courtEnd)) {
      errors.push('Giờ thuê sân chưa hợp lệ')
    } else {
      const courtHours = durationHours(input.courtStart, input.courtEnd)
      if (!Number.isFinite(courtHours) || courtHours <= 0) {
        errors.push('Giờ thuê sân chưa hợp lệ')
      } else {
        for (const p of input.players) {
          if ((p.startTime === null) !== (p.endTime === null)) {
            errors.push(`Giờ chơi của ${p.name} chưa đủ 2 mốc`)
            continue
          }
          if (p.startTime !== null && p.endTime !== null) {
            if (!HHMM.test(p.startTime) || !HHMM.test(p.endTime)) {
              errors.push(`Giờ chơi của ${p.name} chưa đủ 2 mốc`)
              continue
            }
            const off = offsetFromCourtStart(p.startTime, input.courtStart)
            const len = durationHours(p.startTime, p.endTime)
            if (off + len > courtHours + 1e-9) {
              errors.push(`Giờ chơi của ${p.name} nằm ngoài giờ thuê sân`)
            }
          }
        }
      }
    }
  }
  // Khoản phát sinh: nhãn rỗng KHÔNG phải lỗi (hàng được tạo rỗng rồi gõ dần),
  // amount === 0 cũng hợp lệ.
  const playerIds = new Set(input.players.map((p) => p.id))
  for (const e of input.extras) {
    const label = e.label.trim() || 'Khoản khác'
    if (!Number.isFinite(e.amount) || e.amount < 0) {
      errors.push(`Số tiền của "${label}" chưa hợp lệ`)
    }
    if (!playerIds.has(e.playerId)) {
      errors.push(`Khoản phát sinh "${label}" chưa chọn người trả`)
    }
  }
  return errors
}
