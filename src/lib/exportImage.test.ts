import { formatDateLabel, formatFilenameDate } from './exportImage'

test('formatDateLabel renders DD/MM/YYYY with zero-padding', () => {
  expect(formatDateLabel(new Date(2026, 7, 13))).toBe('13/08/2026')
  expect(formatDateLabel(new Date(2026, 0, 1))).toBe('01/01/2026')
})

test('formatFilenameDate renders YYYY-MM-DD with zero-padding', () => {
  expect(formatFilenameDate(new Date(2026, 7, 13))).toBe('2026-08-13')
  expect(formatFilenameDate(new Date(2026, 0, 1))).toBe('2026-01-01')
})
