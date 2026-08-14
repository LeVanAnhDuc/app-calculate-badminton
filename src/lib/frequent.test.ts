import { frequentPlayers } from './frequent'
import type { RosterEntry, SavedSession } from './storage'
import type { CalcResult, Gender, Player, SessionInput } from './types'

function player(name: string, gender: Gender = 'male'): Player {
  return {
    id: `${name}-${gender}`,
    name,
    gender,
    halfSession: false,
    startTime: null,
    endTime: null,
    paid: false,
  }
}

const emptyResult: CalcResult = {
  totalCost: 0,
  totalCollected: 0,
  surplus: 0,
  emptyHours: 0,
  players: [],
}

function session(savedAt: string, players: Player[]): SavedSession {
  const input: SessionInput = {
    mode: 'ratio',
    shuttleCount: 0,
    shuttlePrice: 25000,
    courtFee: 0,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1,
    rounding: 'up1000',
    players,
  }
  return { id: savedAt, savedAt, input, result: emptyResult }
}

const names = (list: RosterEntry[]) => list.map((r) => r.name)

test('ranks by how many saved sessions each person appears in', () => {
  const history = [
    session('2026-08-03T10:00:00.000Z', [player('Tuấn'), player('Hùng'), player('Lan', 'female')]),
    session('2026-08-02T10:00:00.000Z', [player('Tuấn'), player('Hùng')]),
    session('2026-08-01T10:00:00.000Z', [player('Tuấn')]),
  ]
  expect(names(frequentPlayers(history, [], []))).toEqual(['Tuấn', 'Hùng', 'Lan'])
})

test('a name repeated inside one session still counts as a single session', () => {
  const history = [
    session('2026-08-02T10:00:00.000Z', [player('Tuấn'), player('tuấn'), player('Hùng')]),
    session('2026-08-01T10:00:00.000Z', [player('Hùng')]),
  ]
  // Hùng: 2 buổi > Tuấn: 1 buổi (dù tên Tuấn xuất hiện 2 lần trong 1 buổi)
  expect(names(frequentPlayers(history, [], []))).toEqual(['Hùng', 'Tuấn'])
})

test('counts names case-insensitively and shows the most recent spelling', () => {
  const history = [
    session('2026-08-02T10:00:00.000Z', [player('Tuấn')]),
    session('2026-08-01T10:00:00.000Z', [player('TUẤN')]),
  ]
  expect(frequentPlayers(history, [], [])).toEqual([{ name: 'Tuấn', gender: 'male' }])
})

test('ties on count are broken by the most recent session first', () => {
  const history = [
    session('2026-08-05T10:00:00.000Z', [player('Hùng')]),
    session('2026-08-09T10:00:00.000Z', [player('Lan', 'female')]),
    session('2026-08-01T10:00:00.000Z', [player('Minh')]),
  ]
  expect(names(frequentPlayers(history, [], []))).toEqual(['Lan', 'Hùng', 'Minh'])
})

test('same count and same recency falls back to name order for determinism', () => {
  const history = [session('2026-08-01T10:00:00.000Z', [player('Cường'), player('An'), player('Bình')])]
  expect(names(frequentPlayers(history, [], []))).toEqual(['An', 'Bình', 'Cường'])
})

test('excludes people already in the current session, case-insensitively', () => {
  const history = [
    session('2026-08-02T10:00:00.000Z', [player('Tuấn'), player('Hùng')]),
    session('2026-08-01T10:00:00.000Z', [player('Tuấn'), player('Hùng')]),
  ]
  const current = [player('TUẤN')]
  expect(names(frequentPlayers(history, [], current))).toEqual(['Hùng'])
})

test('gender comes from the roster entry when the person is in the roster', () => {
  const history = [session('2026-08-01T10:00:00.000Z', [player('Hoa', 'male')])]
  const roster: RosterEntry[] = [{ name: 'Hoa', gender: 'female' }]
  expect(frequentPlayers(history, roster, [])).toEqual([{ name: 'Hoa', gender: 'female' }])
})

test('gender falls back to the most recent appearance when the roster has no entry', () => {
  const history = [
    session('2026-08-02T10:00:00.000Z', [player('Hoa', 'female')]),
    session('2026-08-01T10:00:00.000Z', [player('Hoa', 'male')]),
  ]
  expect(frequentPlayers(history, [], [])).toEqual([{ name: 'Hoa', gender: 'female' }])
})

test('history order is not trusted — recency is read from savedAt', () => {
  const history = [
    session('2026-08-01T10:00:00.000Z', [player('Hoa', 'male')]),
    session('2026-08-02T10:00:00.000Z', [player('Hoa', 'female')]),
  ]
  expect(frequentPlayers(history, [], [])).toEqual([{ name: 'Hoa', gender: 'female' }])
})

test('roster people with no history appear only after everyone with a count', () => {
  const history = [session('2026-08-01T10:00:00.000Z', [player('Tuấn')])]
  const roster: RosterEntry[] = [
    { name: 'An', gender: 'male' },
    { name: 'Tuấn', gender: 'male' },
  ]
  expect(names(frequentPlayers(history, roster, []))).toEqual(['Tuấn', 'An'])
})

test('limits the list, default 8', () => {
  const many = Array.from({ length: 12 }, (_, i) => player(`P${String(i).padStart(2, '0')}`))
  const history = [session('2026-08-01T10:00:00.000Z', many)]
  expect(frequentPlayers(history, [], [])).toHaveLength(8)
  expect(names(frequentPlayers(history, [], [], 3))).toEqual(['P00', 'P01', 'P02'])
  expect(frequentPlayers(history, [], [], 0)).toEqual([])
})

test('empty history still surfaces the roster; everything empty gives an empty list', () => {
  expect(frequentPlayers([], [{ name: 'An', gender: 'male' }], [])).toEqual([
    { name: 'An', gender: 'male' },
  ])
  expect(frequentPlayers([], [], [])).toEqual([])
})

test('ignores blank names in history and roster', () => {
  const history = [session('2026-08-01T10:00:00.000Z', [player('   '), player('Tuấn')])]
  expect(names(frequentPlayers(history, [{ name: '  ', gender: 'male' }], []))).toEqual(['Tuấn'])
})
