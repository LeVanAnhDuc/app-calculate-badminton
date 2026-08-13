import { formatNumber, formatVND, parseMoney } from './format'

test('formatNumber groups thousands with dots', () => {
  expect(formatNumber(1234567)).toBe('1.234.567')
  expect(formatNumber(0)).toBe('0')
  expect(formatNumber(999)).toBe('999')
  expect(formatNumber(78260.87)).toBe('78.261')
})

test('formatVND appends đ', () => {
  expect(formatVND(300000)).toBe('300.000đ')
  expect(formatVND(0)).toBe('0đ')
})

test('parseMoney strips separators and junk', () => {
  expect(parseMoney('25.000')).toBe(25000)
  expect(parseMoney('300000')).toBe(300000)
  expect(parseMoney('')).toBe(0)
  expect(parseMoney('abc')).toBe(0)
})
