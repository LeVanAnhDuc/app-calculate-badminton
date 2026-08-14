import { BANKS, findBank } from './banks'

test('bank list has 40+ banks with unique 6-digit BINs', () => {
  expect(BANKS.length).toBeGreaterThanOrEqual(40)
  const bins = BANKS.map((b) => b.bin)
  expect(new Set(bins).size).toBe(bins.length)
  for (const bin of bins) expect(bin).toMatch(/^\d{6}$/)
})

test('findBank resolves well-known BINs', () => {
  expect(findBank('970436')?.shortName).toBe('Vietcombank')
  expect(findBank('970422')?.shortName).toBe('MB Bank')
  expect(findBank('000000')).toBeUndefined()
})
