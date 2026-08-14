import { buildQRItems, formatDateLabel, formatFilenameDate, qrSectionHeight } from './exportImage'
import type { CalcResult, Player } from './types'

test('formatDateLabel renders DD/MM/YYYY with zero-padding', () => {
  expect(formatDateLabel(new Date(2026, 7, 13))).toBe('13/08/2026')
  expect(formatDateLabel(new Date(2026, 0, 1))).toBe('01/01/2026')
})

test('formatFilenameDate renders YYYY-MM-DD with zero-padding', () => {
  expect(formatFilenameDate(new Date(2026, 7, 13))).toBe('2026-08-13')
  expect(formatFilenameDate(new Date(2026, 0, 1))).toBe('2026-01-01')
})

const account = { bankBin: '970422', accountNo: '0011002233', accountName: '' }

const players: Player[] = [
  { id: 'a', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
  { id: 'b', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: true },
]

const result = {
  totalCost: 100000,
  totalCollected: 100000,
  surplus: 0,
  emptyHours: 0,
  players: [
    { playerId: 'a', name: 'Tuấn', gender: 'male', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 57000, amount: 57000 },
    { playerId: 'b', name: 'Lan', gender: 'female', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 43000, amount: 43000 },
  ],
} as CalcResult

test('buildQRItems returns unpaid players only, with payload + session-date memo', () => {
  const items = buildQRItems(result, players, account, new Date(2026, 7, 14))
  expect(items).toHaveLength(1)
  expect(items[0].name).toBe('Tuấn')
  expect(items[0].amount).toBe(57000)
  expect(items[0].payload).toContain('970422')
  expect(items[0].payload).toContain('540557000')
  expect(items[0].payload).toContain('Cau long 14/08 Tuan')
})

test('buildQRItems returns [] without a collector account', () => {
  expect(buildQRItems(result, players, null, new Date())).toEqual([])
})

test('qrSectionHeight: 0 items → 0; 1–3 items → one row; 4 → two rows', () => {
  expect(qrSectionHeight(0)).toBe(0)
  expect(qrSectionHeight(1)).toBe(qrSectionHeight(3))
  expect(qrSectionHeight(4)).toBe(qrSectionHeight(3) + (qrSectionHeight(3) - 56))
})
