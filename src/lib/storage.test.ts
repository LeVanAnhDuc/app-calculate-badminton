import {
  addToRoster,
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  loadCollectorAccount,
  loadCurrentSession,
  loadHistory,
  loadInstallDismissed,
  loadRoster,
  loadSettings,
  saveCollectorAccount,
  saveCurrentSession,
  saveHistory,
  saveInstallDismissed,
  saveRoster,
  saveSettings,
  type SavedSession,
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
  // Missing shuttles, courtFee, etc
  localStorage.setItem('currentSession', JSON.stringify({ mode: 'ratio', players: [] }))
  expect(loadCurrentSession()).toBeNull()
})

test('currentSession rejects malformed players', () => {
  // Player missing gender
  const incomplete = {
    mode: 'ratio' as const,
    shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
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
    shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
    courtFee: 500000,
    courtStart: '09:00',
    courtEnd: '11:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000' as const,
    players: [
      {
        id: '1',
        name: 'Tuấn',
        gender: 'male' as const,
        halfSession: false,
        startTime: null,
        endTime: null,
        paid: false,
      },
    ],
    extras: [],
  }
  localStorage.setItem('currentSession', JSON.stringify(valid))
  const loaded = loadCurrentSession()
  expect(loaded).toEqual(valid)
})

test('migration: old currentSession without `paid` on players loads intact with paid defaulted to false', () => {
  // simulates data saved before paid tracking existed — no `paid` field at all
  const legacy = {
    mode: 'ratio' as const,
    shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
    courtFee: 500000,
    courtStart: '09:00',
    courtEnd: '11:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000' as const,
    players: [
      { id: '1', name: 'Tuấn', gender: 'male' as const, halfSession: false, startTime: null, endTime: null },
      { id: '2', name: 'Lan', gender: 'female' as const, halfSession: true, startTime: null, endTime: null },
    ],
  }
  localStorage.setItem('currentSession', JSON.stringify(legacy))
  const loaded = loadCurrentSession()
  expect(loaded).not.toBeNull()
  expect(loaded!.players).toHaveLength(2)
  expect(loaded!.players[0]).toEqual({ ...legacy.players[0], paid: false })
  expect(loaded!.players[1]).toEqual({ ...legacy.players[1], paid: false })
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
          shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
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
        shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
        courtFee: 500000,
        courtStart: '09:00',
        courtEnd: '11:00',
        maleRatio: 1.5,
        femaleRatio: 1.0,
        rounding: 'up1000' as const,
        players: [
          {
            id: '1',
            name: 'Tuấn',
            gender: 'male' as const,
            halfSession: false,
            startTime: null,
            endTime: null,
            paid: false,
          },
        ],
        extras: [],
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
            extras: [],
            extrasTotal: 0,
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

test('migration: old history entry without `paid` on players loads intact, not filtered out, paid defaulted to false', () => {
  const legacy = [
    {
      id: 'session1',
      savedAt: '2024-01-01T10:00:00Z',
      input: {
        mode: 'ratio' as const,
        shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
        courtFee: 500000,
        courtStart: '09:00',
        courtEnd: '11:00',
        maleRatio: 1.5,
        femaleRatio: 1.0,
        rounding: 'up1000' as const,
        // no `paid` field at all — this is what pre-feature data looks like
        players: [
          { id: '1', name: 'Tuấn', gender: 'male' as const, halfSession: false, startTime: null, endTime: null },
        ],
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
  localStorage.setItem('history', JSON.stringify(legacy))
  const loaded = loadHistory()
  expect(loaded).toHaveLength(1)
  expect(loaded[0].input.players[0]).toEqual({ ...legacy[0].input.players[0], paid: false })
})

function makeSession(id: string, savedAt: string): SavedSession {
  return {
    id,
    savedAt,
    input: {
      mode: 'ratio',
      shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
      courtFee: 500000,
      courtStart: '09:00',
      courtEnd: '11:00',
      maleRatio: 1.5,
      femaleRatio: 1.0,
      rounding: 'up1000',
      players: [
        { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
      ],
      extras: [],
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
          gender: 'male',
          halfSession: false,
          hours: null,
          courtShare: 250000,
          shuttleShare: 250000,
          extras: [],
          extrasTotal: 0,
          raw: 500000,
          amount: 500000,
        },
      ],
    },
  }
}

test('saveHistory caps stored history at HISTORY_LIMIT, keeping the newest entries', () => {
  // newest-first: index 0 is the newest session, index 500 is the oldest
  const entries = Array.from({ length: HISTORY_LIMIT + 1 }, (_, i) => makeSession(`s${i}`, `s${i}`))
  saveHistory(entries)
  const loaded = loadHistory()
  expect(loaded).toHaveLength(HISTORY_LIMIT)
  expect(loaded[0].id).toBe('s0') // newest survives
  expect(loaded.some((s) => s.id === `s${HISTORY_LIMIT}`)).toBe(false) // oldest dropped
})

test('history salvages valid entries instead of wiping everything when one entry is malformed', () => {
  const good = {
    id: 'session1',
    savedAt: '2024-01-01T10:00:00Z',
    input: {
      mode: 'ratio' as const,
      shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
      courtFee: 500000,
      courtStart: '09:00',
      courtEnd: '11:00',
      maleRatio: 1.5,
      femaleRatio: 1.0,
      rounding: 'up1000' as const,
      players: [
        {
          id: '1',
          name: 'Tuấn',
          gender: 'male' as const,
          halfSession: false,
          startTime: null,
          endTime: null,
          paid: false,
        },
      ],
      extras: [],
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
          extras: [],
          extrasTotal: 0,
          raw: 500000,
          amount: 500000,
        },
      ],
    },
  }
  const bad = { id: 'session2', savedAt: 'bad-date', input: { mode: 'ratio' }, result: null }
  localStorage.setItem('history', JSON.stringify([good, bad]))
  expect(loadHistory()).toEqual([good])
})

test('installDismissed mặc định false khi chưa có gì trong localStorage', () => {
  expect(loadInstallDismissed()).toBe(false)
})

test('installDismissed lưu và đọc lại được', () => {
  saveInstallDismissed(true)
  expect(loadInstallDismissed()).toBe(true)
})

test('installDismissed bỏ qua dữ liệu hỏng, trả về false', () => {
  localStorage.setItem('installDismissed', 'khong-phai-json')
  expect(loadInstallDismissed()).toBe(false)
})

test('installDismissed bỏ qua giá trị sai kiểu', () => {
  localStorage.setItem('installDismissed', '"co"')
  expect(loadInstallDismissed()).toBe(false)
})

test('collectorAccount roundtrip; default null', () => {
  expect(loadCollectorAccount()).toBeNull()
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: 'NGUYEN VAN A' })
  expect(loadCollectorAccount()).toEqual({
    bankBin: '970422',
    accountNo: '0011002233',
    accountName: 'NGUYEN VAN A',
  })
})

test('collectorAccount rejects corrupt or incomplete data', () => {
  localStorage.setItem('collectorAccount', '{not json')
  expect(loadCollectorAccount()).toBeNull()
  localStorage.setItem('collectorAccount', JSON.stringify({ bankBin: '970422' }))
  expect(loadCollectorAccount()).toBeNull()
})

describe('chi phí phát sinh khác', () => {
  const legacyInput = {
    mode: 'ratio' as const,
    shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }],
    courtFee: 500000,
    courtStart: '09:00',
    courtEnd: '11:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000' as const,
    players: [
      {
        id: '1',
        name: 'Tuấn',
        gender: 'male' as const,
        halfSession: false,
        startTime: null,
        endTime: null,
        paid: false,
      },
      {
        id: '2',
        name: 'Lan',
        gender: 'female' as const,
        halfSession: false,
        startTime: null,
        endTime: null,
        paid: false,
      },
    ],
  }

  // 12
  test('migration: a currentSession saved without `extras` loads with extras: [] and keeps every player', () => {
    localStorage.setItem('currentSession', JSON.stringify(legacyInput))
    const loaded = loadCurrentSession()
    expect(loaded).not.toBeNull()
    expect(loaded!.extras).toEqual([])
    expect(loaded!.players).toHaveLength(2)
    expect(loaded!.players.map((p) => p.name)).toEqual(['Tuấn', 'Lan'])
  })

  // 13
  test('migration: a history result saved without `extrasTotal` loads with 0, amounts untouched', () => {
    const legacy = [
      {
        id: 'session1',
        savedAt: '2024-01-01T10:00:00Z',
        input: legacyInput,
        result: {
          totalCost: 750000,
          totalCollected: 750000,
          surplus: 0,
          emptyHours: 0,
          players: [
            {
              playerId: '1',
              name: 'Tuấn',
              gender: 'male' as const,
              halfSession: false,
              hours: null,
              courtShare: 300000,
              shuttleShare: 150000,
              raw: 450000,
              amount: 450000,
            },
          ],
        },
      },
    ]
    localStorage.setItem('history', JSON.stringify(legacy))
    const loaded = loadHistory()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].result.players[0].extrasTotal).toBe(0)
    expect(loaded[0].result.players[0].amount).toBe(450000)
    expect(loaded[0].input.extras).toEqual([])
  })

  // 14
  test('round-trip: a session with two extras comes back with every field intact', () => {
    const extras = [
      { id: 'e1', label: 'Nước', amount: 15000, playerIds: ['1'] },
      { id: 'e2', label: 'Thuê vợt', amount: 20000, playerIds: ['2'] },
    ]
    saveCurrentSession({ ...legacyInput, extras })
    expect(loadCurrentSession()!.extras).toEqual(extras)
  })

  // 15
  test('guard rejects a malformed extras entry and falls back instead of throwing', () => {
    localStorage.setItem(
      'currentSession',
      JSON.stringify({ ...legacyInput, extras: [{ amount: 'nhiều' }] }),
    )
    expect(() => loadCurrentSession()).not.toThrow()
    expect(loadCurrentSession()).toBeNull()
  })

  describe('di trú v1.4.0 → khoản dùng chung', () => {
    // 17
    test('an extra saved as {playerId} loads as {playerIds}, with the old key gone for good', () => {
      localStorage.setItem(
        'currentSession',
        JSON.stringify({
          ...legacyInput,
          extras: [{ id: 'e1', label: 'Nước', amount: 15000, playerId: 'p1' }],
        }),
      )
      const loaded = loadCurrentSession()
      expect(loaded).not.toBeNull()
      expect(loaded!.extras).toEqual([
        { id: 'e1', label: 'Nước', amount: 15000, playerIds: ['p1'] },
      ])
      // the orphaned key must not be written back on the next save
      expect(loaded!.extras[0]).not.toHaveProperty('playerId')
    })

    // 18
    test('history migrates too: playerIds filled in, extras defaulted to [], saved money untouched', () => {
      localStorage.setItem(
        'history',
        JSON.stringify([
          {
            id: 'session1',
            savedAt: '2024-01-01T10:00:00Z',
            input: {
              ...legacyInput,
              extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerId: '1' }],
            },
            result: {
              totalCost: 770000,
              totalCollected: 770000,
              surplus: 0,
              emptyHours: 0,
              players: [
                {
                  playerId: '1',
                  name: 'Tuấn',
                  gender: 'male',
                  halfSession: false,
                  hours: null,
                  courtShare: 300000,
                  shuttleShare: 150000,
                  extrasTotal: 20000,
                  raw: 470000,
                  amount: 470000,
                },
              ],
            },
          },
        ]),
      )
      const loaded = loadHistory()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].input.extras[0].playerIds).toEqual(['1'])
      expect(loaded[0].result.players[0].extras).toEqual([])
      // saved money is NEVER recomputed
      expect(loaded[0].result.players[0].extrasTotal).toBe(20000)
      expect(loaded[0].result.players[0].amount).toBe(470000)
    })

    // 19
    test('the guard accepts both shapes side by side — neither session is filtered out', () => {
      const entry = (id: string, extras: unknown) => ({
        id,
        savedAt: '2024-01-01T10:00:00Z',
        input: { ...legacyInput, extras },
        result: {
          totalCost: 1,
          totalCollected: 1,
          surplus: 0,
          emptyHours: 0,
          players: [],
        },
      })
      localStorage.setItem(
        'history',
        JSON.stringify([
          entry('old', [{ id: 'e1', label: 'Nước', amount: 1000, playerId: '1' }]),
          entry('new', [{ id: 'e2', label: 'Nước', amount: 1000, playerIds: ['1', '2'] }]),
        ]),
      )
      const loaded = loadHistory()
      expect(loaded.map((s) => s.id)).toEqual(['old', 'new'])
      expect(loaded[0].input.extras[0].playerIds).toEqual(['1'])
      expect(loaded[1].input.extras[0].playerIds).toEqual(['1', '2'])
    })

    // 20
    test('the guard still rejects a playerIds array that is not made of strings', () => {
      localStorage.setItem(
        'currentSession',
        JSON.stringify({
          ...legacyInput,
          extras: [{ id: 'e1', label: 'Nước', amount: 1000, playerIds: [1, 2] }],
        }),
      )
      expect(() => loadCurrentSession()).not.toThrow()
      expect(loadCurrentSession()).toBeNull()
    })

    // 21
    test('round-trip: a shared extra keeps all three ids, in order', () => {
      const extras = [{ id: 'e1', label: 'Nước', amount: 90000, playerIds: ['a', 'b', 'c'] }]
      saveCurrentSession({ ...legacyInput, extras })
      expect(loadCurrentSession()!.extras).toEqual(extras)
      expect(loadCurrentSession()!.extras[0].playerIds).toEqual(['a', 'b', 'c'])
    })
  })
})

describe('di trú shuttles', () => {
  const legacyInput = {
    mode: 'ratio',
    shuttleCount: 10,
    shuttlePrice: 25000,
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1,
    rounding: 'up1000',
    players: [],
    extras: [],
  }

  test('buổi cũ load ra đúng một dòng cầu', () => {
    localStorage.setItem('currentSession', JSON.stringify(legacyInput))
    const s = loadCurrentSession()
    expect(s?.shuttles).toEqual([
      { id: 'shuttle-legacy', name: '', count: 10, price: 25000 },
    ])
    expect(s).not.toHaveProperty('shuttleCount')
    expect(s).not.toHaveProperty('shuttlePrice')
  })

  test('buổi mới round-trip nguyên vẹn', () => {
    const shuttles = [
      { id: 'a', name: 'Hải Yến', count: 4, price: 25000 },
      { id: 'b', name: 'Ba Sao', count: 2, price: 20000 },
    ]
    localStorage.setItem('currentSession', JSON.stringify({ ...legacyInput, shuttleCount: undefined, shuttlePrice: undefined, shuttles }))
    expect(loadCurrentSession()?.shuttles).toEqual(shuttles)
  })

  test('shuttles sai kiểu thì buổi bị loại', () => {
    localStorage.setItem(
      'currentSession',
      JSON.stringify({ ...legacyInput, shuttles: [{ id: 'a', name: 'X', count: 'nhiều', price: 1 }] }),
    )
    expect(loadCurrentSession()).toBeNull()
  })

  test('settings cũ thiếu shuttleName thì mặc định rỗng', () => {
    localStorage.setItem(
      'settings',
      JSON.stringify({ mode: 'ratio', maleRatio: 1.5, femaleRatio: 1, shuttlePrice: 25000, rounding: 'up1000' }),
    )
    expect(loadSettings().shuttleName).toBe('')
    expect(loadSettings().shuttlePrice).toBe(25000)
  })
})
