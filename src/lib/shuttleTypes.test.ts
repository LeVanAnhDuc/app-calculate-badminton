import { frequentShuttleTypes } from './shuttleTypes'
import type { SavedSession } from './storage'
import type { ShuttleLine } from './types'

function session(savedAt: string, shuttles: ShuttleLine[]): SavedSession {
  return {
    id: savedAt,
    savedAt,
    input: {
      mode: 'ratio',
      shuttles,
      courtFee: 150000,
      courtStart: '19:00',
      courtEnd: '21:00',
      maleRatio: 1.5,
      femaleRatio: 1,
      rounding: 'up1000',
      players: [],
      extras: [],
    },
    result: { totalCost: 0, totalCollected: 0, surplus: 0, emptyHours: 0, players: [] },
  }
}

const line = (name: string, price: number): ShuttleLine => ({ id: name, name, count: 1, price })

test('xếp theo số buổi giảm dần', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('Hải Yến', 25000), line('Ba Sao', 20000)]),
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 26000)]),
  ]
  expect(frequentShuttleTypes(history, [])).toEqual([
    { name: 'Hải Yến', price: 26000 },
    { name: 'Ba Sao', price: 20000 },
  ])
})

test('giá lấy từ buổi mới nhất kể cả khi lịch sử không theo thứ tự', () => {
  const history = [
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 26000)]),
    session('2026-08-05T00:00:00Z', [line('hải yến', 30000)]),
    session('2026-08-03T00:00:00Z', [line('Hải Yến', 27000)]),
  ]
  expect(frequentShuttleTypes(history, [])).toEqual([{ name: 'hải yến', price: 30000 }])
})

test('trùng tên trong cùng một buổi chỉ tính 1', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('Ba Sao', 20000), line('Ba Sao', 20000)]),
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 25000)]),
    session('2026-08-03T00:00:00Z', [line('Hải Yến', 25000)]),
  ]
  expect(frequentShuttleTypes(history, []).map((t) => t.name)).toEqual(['Hải Yến', 'Ba Sao'])
})

test('bỏ tên rỗng và tên trong excludeNames (không phân biệt hoa/thường)', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('', 25000), line('Ba Sao', 20000), line('Hải Yến', 25000)]),
  ]
  expect(frequentShuttleTypes(history, [' hải yến '])).toEqual([{ name: 'Ba Sao', price: 20000 }])
})

test('giới hạn số lượng trả về', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('A', 1), line('B', 2), line('C', 3)]),
  ]
  expect(frequentShuttleTypes(history, [], 2)).toHaveLength(2)
  expect(frequentShuttleTypes(history, [], 0)).toEqual([])
})
