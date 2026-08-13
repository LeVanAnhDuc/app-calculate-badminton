import { toMinutes, durationHours, formatHours } from './time'

test('toMinutes parses HH:mm', () => {
  expect(toMinutes('19:00')).toBe(1140)
  expect(toMinutes('00:30')).toBe(30)
})

test('durationHours handles normal, fractional, overnight, zero', () => {
  expect(durationHours('19:00', '21:00')).toBe(2)
  expect(durationHours('18:30', '21:45')).toBe(3.25)
  expect(durationHours('23:00', '01:00')).toBe(2)
  expect(durationHours('19:00', '19:00')).toBe(0)
})

test('formatHours renders Vietnamese hour label', () => {
  expect(formatHours(2)).toBe('2 giờ')
  expect(formatHours(1.5)).toBe('1.5 giờ')
  expect(formatHours(3.25)).toBe('3.25 giờ')
})
