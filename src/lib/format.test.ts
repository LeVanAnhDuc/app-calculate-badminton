import { formatNumber, formatVND, parseMoney, parseRatio } from './format'

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

test('parseRatio đọc được cả dấu phẩy lẫn dấu chấm thập phân', () => {
  expect(parseRatio('1,5')).toBe(1.5)
  expect(parseRatio('1.5')).toBe(1.5)
  expect(parseRatio('2')).toBe(2)
  expect(parseRatio('0,5')).toBe(0.5)
  expect(parseRatio(',5')).toBe(0.5)
  expect(parseRatio('1 , 5')).toBe(1.5)
})

test('parseRatio trả null khi chuỗi chưa thành số hợp lệ', () => {
  expect(parseRatio('')).toBeNull()
  expect(parseRatio('1,')).toBeNull()
  expect(parseRatio('1.')).toBeNull()
  expect(parseRatio(',')).toBeNull()
  expect(parseRatio('.')).toBeNull()
  expect(parseRatio('abc')).toBeNull()
  // nhiều dấu thập phân là chuỗi hỏng, không đoán bừa
  expect(parseRatio('1,5,5')).toBeNull()
})

test('parseRatio trả null với hệ số không dương', () => {
  expect(parseRatio('0')).toBeNull()
  expect(parseRatio('0,0')).toBeNull()
  // dấu trừ bị loại như parseMoney nên '-1' đọc thành 1, không phải số âm
  expect(parseRatio('-1')).toBe(1)
})
