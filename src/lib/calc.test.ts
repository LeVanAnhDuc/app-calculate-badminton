import { calcHourlyMode, calcRatioMode, calcSession, roundAmount, validateSession } from './calc'
import type { Player, SessionInput } from './types'

function player(p: Partial<Player> & Pick<Player, 'name' | 'gender'>): Player {
  return { id: p.name, halfSession: false, startTime: null, endTime: null, ...p }
}

function ratioInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'ratio',
    shuttleCount: 6,
    shuttlePrice: 25000,
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', halfSession: true }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female' }),
    ],
    ...over,
  }
}

test('roundAmount', () => {
  expect(roundAmount(78260.87, 'up1000')).toBe(79000)
  expect(roundAmount(78260.87, 'exact')).toBe(78261)
  expect(roundAmount(79000, 'up1000')).toBe(79000)
})

test('mode 1: approved spec example (300k, ratios 1.5/1.0, Minh half-session)', () => {
  const r = calcRatioMode(ratioInput())
  expect(r.totalCost).toBe(300000)
  expect(r.players.map((p) => p.amount)).toEqual([79000, 79000, 40000, 53000, 53000])
  expect(r.totalCollected).toBe(304000)
  expect(r.surplus).toBe(4000)
  expect(r.emptyHours).toBe(0)
})

test('mode 1: exact rounding keeps collected equal to cost for this example', () => {
  const r = calcRatioMode(ratioInput({ rounding: 'exact' }))
  expect(r.players.map((p) => p.amount)).toEqual([78261, 78261, 39130, 52174, 52174])
  expect(r.totalCollected).toBe(300000)
  expect(r.surplus).toBe(0)
})

test('mode 1: all-male group splits evenly', () => {
  const r = calcRatioMode(
    ratioInput({
      players: [player({ name: 'A', gender: 'male' }), player({ name: 'B', gender: 'male' })],
    }),
  )
  expect(r.players.map((p) => p.amount)).toEqual([150000, 150000])
})

function hourlyInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'hourly',
    shuttleCount: 6,
    shuttlePrice: 25000,
    courtFee: 300000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', startTime: '20:00', endTime: '21:00' }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female', startTime: '19:00', endTime: '20:30' }),
    ],
    ...over,
  }
}

test('mode 2: approved spec example (court 300k by hours, shuttle 150k by ratio)', () => {
  const r = calcHourlyMode(hourlyInput())
  expect(r.totalCost).toBe(450000)
  expect(r.players.map((p) => p.amount)).toEqual([106000, 106000, 70000, 94000, 77000])
  expect(r.players.map((p) => p.hours)).toEqual([2, 2, 1, 2, 1.5])
  expect(r.totalCollected).toBe(453000)
  expect(r.surplus).toBe(3000)
  expect(r.emptyHours).toBe(0)
  // breakdown shown in UI
  expect(r.players[0].courtShare).toBeCloseTo(70588.235, 2)
  expect(r.players[0].shuttleShare).toBeCloseTo(34615.385, 2)
})

test('mode 2: idle court time is split equally per head', () => {
  // court 19:00–21:00 fee 200k; both players 19:00–20:00 → 20:00–21:00 idle
  const r = calcHourlyMode(
    hourlyInput({
      courtFee: 200000,
      shuttleCount: 0,
      players: [
        player({ name: 'A', gender: 'male', startTime: '19:00', endTime: '20:00' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '20:00' }),
      ],
    }),
  )
  expect(r.emptyHours).toBe(1)
  // idle 100k split equally (50k each) + played 100k split by hours (50k each)
  expect(r.players.map((p) => p.courtShare)).toEqual([100000, 100000])
})

test('mode 2: zero-hour player pays no court time but still pays shuttle', () => {
  const r = calcHourlyMode(
    hourlyInput({
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '19:00' }),
      ],
    }),
  )
  expect(r.players[1].courtShare).toBe(0)
  expect(r.players[1].shuttleShare).toBe(75000)
})

test('mode 2: overnight rental', () => {
  const r = calcHourlyMode(
    hourlyInput({
      courtStart: '23:00',
      courtEnd: '01:00',
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '23:30', endTime: '00:30' }),
      ],
    }),
  )
  expect(r.players.map((p) => p.hours)).toEqual([2, 1])
})

test('calcSession dispatches on mode', () => {
  expect(calcSession(ratioInput()).emptyHours).toBe(0)
  expect(calcSession(hourlyInput()).totalCost).toBe(450000)
})

test('validateSession catches invalid input', () => {
  expect(validateSession(ratioInput())).toEqual([])
  expect(validateSession(ratioInput({ players: [] }))).toContain('Cần ít nhất 1 người chơi')
  expect(
    validateSession(ratioInput({ shuttleCount: 0, shuttlePrice: 0, courtFee: 0 })),
  ).toContain('Tổng chi phải lớn hơn 0')
  expect(validateSession(ratioInput({ maleRatio: 0 }))).toContain('Hệ số phải lớn hơn 0')
  expect(validateSession(hourlyInput({ courtEnd: '19:00' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
  expect(
    validateSession(
      hourlyInput({
        players: [player({ name: 'A', gender: 'male', startTime: '18:00', endTime: '20:00' })],
      }),
    ),
  ).toContain('Giờ chơi của A nằm ngoài giờ thuê sân')
})

test('validateSession rejects a cleared court time input instead of letting NaN through', () => {
  expect(validateSession(hourlyInput({ courtStart: '' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
  expect(validateSession(hourlyInput({ courtEnd: '' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
})

test('validateSession rejects a cleared player time input instead of letting NaN through', () => {
  expect(
    validateSession(
      hourlyInput({
        players: [player({ name: 'A', gender: 'male', startTime: '', endTime: '21:00' })],
      }),
    ),
  ).toContain('Giờ chơi của A chưa đủ 2 mốc')
})
