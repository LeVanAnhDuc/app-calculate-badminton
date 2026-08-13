import {
  addToRoster,
  DEFAULT_SETTINGS,
  loadCurrentSession,
  loadHistory,
  loadRoster,
  loadSettings,
  saveRoster,
  saveSettings,
} from './storage'

beforeEach(() => localStorage.clear())

test('roster roundtrip and defaults', () => {
  expect(loadRoster()).toEqual([])
  saveRoster([{ name: 'Tuấn', gender: 'male' }])
  expect(loadRoster()).toEqual([{ name: 'Tuấn', gender: 'male' }])
})

test('corrupt data falls back to defaults without throwing', () => {
  localStorage.setItem('roster', '{not json')
  localStorage.setItem('settings', '"just a string"')
  localStorage.setItem('history', '42')
  localStorage.setItem('currentSession', '[]')
  expect(loadRoster()).toEqual([])
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  expect(loadHistory()).toEqual([])
  expect(loadCurrentSession()).toBeNull()
})

test('addToRoster dedups case-insensitively and updates gender', () => {
  let r = addToRoster([], 'Tuấn', 'male')
  r = addToRoster(r, 'tuấn', 'female')
  r = addToRoster(r, 'Lan', 'female')
  expect(r).toEqual([
    { name: 'tuấn', gender: 'female' },
    { name: 'Lan', gender: 'female' },
  ])
})

test('settings roundtrip', () => {
  saveSettings({ ...DEFAULT_SETTINGS, maleRatio: 2 })
  expect(loadSettings().maleRatio).toBe(2)
})
