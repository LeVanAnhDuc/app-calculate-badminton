import { calcRatioMode, roundAmount } from './calc'
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
