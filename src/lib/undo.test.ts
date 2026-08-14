import { insertAt } from './undo'

test('re-inserts an item in the middle of the list', () => {
  expect(insertAt(['a', 'c', 'd'], 1, 'b')).toEqual(['a', 'b', 'c', 'd'])
})

test('re-inserts an item at the end of the list', () => {
  expect(insertAt(['a', 'b'], 2, 'c')).toEqual(['a', 'b', 'c'])
})

test('re-inserts at the front when the index is 0', () => {
  expect(insertAt(['b', 'c'], 0, 'a')).toEqual(['a', 'b', 'c'])
})

test('clamps to the end when the list has shrunk below the old index', () => {
  expect(insertAt(['a'], 5, 'b')).toEqual(['a', 'b'])
  expect(insertAt([], 3, 'a')).toEqual(['a'])
})

test('does not mutate the original list', () => {
  const list = ['a', 'c']
  const next = insertAt(list, 1, 'b')
  expect(list).toEqual(['a', 'c'])
  expect(next).not.toBe(list)
})

test('works with object items, preserving identity', () => {
  const removed = { id: '2', name: 'Nam' }
  const list = [{ id: '1', name: 'An' }, { id: '3', name: 'Bình' }]
  const next = insertAt(list, 1, removed)
  expect(next.map((p) => p.name)).toEqual(['An', 'Nam', 'Bình'])
  expect(next[1]).toBe(removed)
})
