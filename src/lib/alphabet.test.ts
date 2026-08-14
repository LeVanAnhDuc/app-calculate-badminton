import { initialLetter, groupByLetter, normalizeVi, matchesQuery } from './alphabet'

test('normalizeVi strips Vietnamese diacritics and lowercases', () => {
  expect(normalizeVi('Đức')).toBe('duc')
  expect(normalizeVi('Tuấn Anh')).toBe('tuan anh')
  expect(normalizeVi('Ơn Ước')).toBe('on uoc')
  expect(normalizeVi('  Lan  ')).toBe('lan')
})

test('initialLetter folds diacritics onto the plain letter', () => {
  expect(initialLetter('Ánh')).toBe('A')
  expect(initialLetter('Ăn')).toBe('A')
  expect(initialLetter('Ưng')).toBe('U')
  expect(initialLetter('ơn')).toBe('O')
})

test('initialLetter groups Đ under D', () => {
  expect(initialLetter('Đức')).toBe('D')
  expect(initialLetter('đông')).toBe('D')
  expect(initialLetter('Dũng')).toBe('D')
})

test('initialLetter falls back to # for digits, symbols and empty names', () => {
  expect(initialLetter('10 Minh')).toBe('#')
  expect(initialLetter('+Nam')).toBe('#')
  expect(initialLetter('   ')).toBe('#')
  expect(initialLetter('')).toBe('#')
})

test('groupByLetter sorts groups A-Z and puts # last', () => {
  const groups = groupByLetter([
    { name: 'Lan' },
    { name: '2Fast' },
    { name: 'Ánh' },
    { name: 'Đức' },
  ])
  expect(groups.map((g) => g.letter)).toEqual(['A', 'D', 'L', '#'])
})

test('groupByLetter sorts names inside a group with Vietnamese collation', () => {
  const groups = groupByLetter([
    { name: 'Bảo' },
    { name: 'Bình' },
    { name: 'Ba' },
    { name: 'Bắc' },
  ])
  expect(groups).toHaveLength(1)
  expect(groups[0].items.map((e) => e.name)).toEqual(['Ba', 'Bắc', 'Bảo', 'Bình'])
})

test('groupByLetter keeps the extra fields of each entry', () => {
  const groups = groupByLetter([{ name: 'Lan', gender: 'female' as const }])
  expect(groups[0].items[0]).toEqual({ name: 'Lan', gender: 'female' })
})

test('groupByLetter on an empty roster returns no groups', () => {
  expect(groupByLetter([])).toEqual([])
})

test('matchesQuery ignores diacritics and case', () => {
  expect(matchesQuery('Đức', 'duc')).toBe(true)
  expect(matchesQuery('Tuấn Anh', 'TUAN')).toBe(true)
  expect(matchesQuery('Tuấn Anh', 'anh')).toBe(true)
  expect(matchesQuery('Lan', 'minh')).toBe(false)
})

test('matchesQuery treats a blank query as matching everything', () => {
  expect(matchesQuery('Lan', '')).toBe(true)
  expect(matchesQuery('Lan', '   ')).toBe(true)
})
