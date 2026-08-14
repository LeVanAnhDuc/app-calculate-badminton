import { paidCount, unpaidAmount } from './settlement'
import type { Player, PlayerResult } from './types'

function player(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: overrides.id,
    gender: 'male',
    halfSession: false,
    startTime: null,
    endTime: null,
    paid: false,
    ...overrides,
  }
}

function result(playerId: string, amount: number): PlayerResult {
  return {
    playerId,
    name: playerId,
    gender: 'male',
    halfSession: false,
    hours: null,
    courtShare: amount,
    shuttleShare: 0,
    extrasTotal: 0,
    raw: amount,
    amount,
  }
}

test('paidCount counts only players with paid === true', () => {
  const players = [player({ id: '1', paid: true }), player({ id: '2', paid: false }), player({ id: '3', paid: true })]
  expect(paidCount(players)).toBe(2)
})

test('paidCount is 0 when no one has paid', () => {
  const players = [player({ id: '1' }), player({ id: '2' })]
  expect(paidCount(players)).toBe(0)
})

test('unpaidAmount sums amounts only for unpaid players, matched by id', () => {
  const players = [player({ id: '1', paid: true }), player({ id: '2', paid: false })]
  const results = [result('1', 100000), result('2', 80000)]
  expect(unpaidAmount(players, results)).toBe(80000)
})

test('unpaidAmount is 0 when everyone has paid', () => {
  const players = [player({ id: '1', paid: true }), player({ id: '2', paid: true })]
  const results = [result('1', 100000), result('2', 80000)]
  expect(unpaidAmount(players, results)).toBe(0)
})

test('unpaidAmount is the full total when no one has paid', () => {
  const players = [player({ id: '1' }), player({ id: '2' })]
  const results = [result('1', 100000), result('2', 80000)]
  expect(unpaidAmount(players, results)).toBe(180000)
})
