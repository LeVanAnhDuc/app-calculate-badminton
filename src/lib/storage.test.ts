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

test('currentSession rejects incomplete session input', () => {
  // Missing shuttleCount, courtFee, etc
  localStorage.setItem('currentSession', JSON.stringify({ mode: 'ratio', players: [] }))
  expect(loadCurrentSession()).toBeNull()
})

test('currentSession rejects malformed players', () => {
  // Player missing gender
  const incomplete = {
    mode: 'ratio' as const,
    shuttleCount: 10,
    shuttlePrice: 25000,
    courtFee: 500000,
    courtStart: '09:00',
    courtEnd: '11:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000' as const,
    players: [{ id: '1', name: 'Tuấn', halfSession: false, startTime: null, endTime: null }],
  }
  localStorage.setItem('currentSession', JSON.stringify(incomplete))
  expect(loadCurrentSession()).toBeNull()
})

test('currentSession valid roundtrip', () => {
  const valid = {
    mode: 'ratio' as const,
    shuttleCount: 10,
    shuttlePrice: 25000,
    courtFee: 500000,
    courtStart: '09:00',
    courtEnd: '11:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000' as const,
    players: [{ id: '1', name: 'Tuấn', gender: 'male' as const, halfSession: false, startTime: null, endTime: null }],
  }
  localStorage.setItem('currentSession', JSON.stringify(valid))
  const loaded = loadCurrentSession()
  expect(loaded).toEqual(valid)
})

test('history rejects invalid result', () => {
  localStorage.setItem(
    'history',
    JSON.stringify([
      {
        id: 'session1',
        savedAt: 123, // should be string
        input: {
          mode: 'ratio',
          shuttleCount: 10,
          shuttlePrice: 25000,
          courtFee: 500000,
          courtStart: '09:00',
          courtEnd: '11:00',
          maleRatio: 1.5,
          femaleRatio: 1.0,
          rounding: 'up1000',
          players: [{ id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null }],
        },
        result: null,
      },
    ]),
  )
  expect(loadHistory()).toEqual([])
})

test('history valid roundtrip', () => {
  const valid = [
    {
      id: 'session1',
      savedAt: '2024-01-01T10:00:00Z',
      input: {
        mode: 'ratio' as const,
        shuttleCount: 10,
        shuttlePrice: 25000,
        courtFee: 500000,
        courtStart: '09:00',
        courtEnd: '11:00',
        maleRatio: 1.5,
        femaleRatio: 1.0,
        rounding: 'up1000' as const,
        players: [{ id: '1', name: 'Tuấn', gender: 'male' as const, halfSession: false, startTime: null, endTime: null }],
      },
      result: {
        totalCost: 525000,
        totalCollected: 525000,
        surplus: 0,
        emptyHours: 0,
        players: [
          {
            playerId: '1',
            name: 'Tuấn',
            gender: 'male' as const,
            halfSession: false,
            hours: null,
            courtShare: 250000,
            shuttleShare: 250000,
            raw: 500000,
            amount: 500000,
          },
        ],
      },
    },
  ]
  // First save to localStorage
  localStorage.clear()
  localStorage.setItem('history', JSON.stringify(valid))
  const loaded = loadHistory()
  expect(loaded).toEqual(valid)
})
