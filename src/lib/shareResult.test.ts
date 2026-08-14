import { formatResultText } from './shareResult'
import type { CalcResult, Mode, Player } from './types'

const player = (over: Partial<Player>): Player => ({
  id: '1', name: 'Đức', gender: 'male', halfSession: false,
  startTime: null, endTime: null, paid: false, ...over,
})

const pr = (over: Partial<CalcResult['players'][number]>): CalcResult['players'][number] => ({
  playerId: '1', name: 'Đức', gender: 'male', halfSession: false,
  hours: null, courtShare: 0, shuttleShare: 0, raw: 70000, amount: 70000, ...over,
})

const result = (players: CalcResult['players']): CalcResult => ({
  totalCost: 0, totalCollected: 0, surplus: 0, emptyHours: 0, players,
})

test('formats header, paid marks and per-player lines (ratio mode)', () => {
  const players = [
    player({ id: '1', name: 'Đức', paid: true }),
    player({ id: '2', name: 'Lan', gender: 'female', halfSession: true }),
  ]
  const r = result([
    pr({ playerId: '1', name: 'Đức', amount: 70000 }),
    pr({ playerId: '2', name: 'Lan', gender: 'female', halfSession: true, amount: 35000 }),
  ])
  expect(formatResultText(r, 'ratio' as Mode, '14/08/2026', players)).toBe(
    '🏸 Tính tiền cầu lông 14/08/2026\n' +
      '✓ Đức (Nam): 70.000đ\n' +
      '○ Lan (Nữ · ½ buổi): 35.000đ',
  )
})

test('hourly mode shows hours note', () => {
  const players = [player({ id: '1', name: 'Hùng' })]
  const r = result([pr({ playerId: '1', name: 'Hùng', hours: 1.5, amount: 52000 })])
  expect(formatResultText(r, 'hourly', '14/08/2026', players)).toBe(
    '🏸 Tính tiền cầu lông 14/08/2026\n○ Hùng (Nam · 1.5 giờ): 52.000đ',
  )
})

test('never contains totals', () => {
  const players = [player({})]
  const r = { ...result([pr({})]), totalCollected: 300000, surplus: 5000, totalCost: 295000 }
  const text = formatResultText(r, 'ratio', '14/08/2026', players)
  expect(text).not.toMatch(/[Tt]ổng/)
  expect(text).not.toMatch(/[Ss]ố dư/)
})
