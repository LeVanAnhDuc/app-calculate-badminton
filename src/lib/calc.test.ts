import {
  calcHourlyMode,
  calcRatioMode,
  calcSession,
  extraSharesOf,
  extrasOf,
  extrasTotal,
  roundAmount,
  validateSession,
} from './calc'
import type { ExtraCost, Player, SessionInput } from './types'

function player(p: Partial<Player> & Pick<Player, 'name' | 'gender'>): Player {
  return { id: p.name, halfSession: false, startTime: null, endTime: null, paid: false, ...p }
}

function ratioInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'ratio',
    shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', halfSession: true }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female' }),
    ],
    extras: [],
    ...over,
  }
}

test('roundAmount', () => {
  expect(roundAmount(78260.87, 'up1000')).toBe(79000)
  expect(roundAmount(78260.87, 'exact')).toBe(78261)
  expect(roundAmount(79000, 'up1000')).toBe(79000)
})

test('mode 1: approved spec example (300k, ratios 1.5/1.0, Minh half-session)', () => {
  const r = calcRatioMode(ratioInput())
  expect(r.totalCost).toBe(300000)
  expect(r.players.map((p) => p.amount)).toEqual([79000, 79000, 40000, 53000, 53000])
  expect(r.totalCollected).toBe(304000)
  expect(r.surplus).toBe(4000)
  expect(r.emptyHours).toBe(0)
})

test('mode 1: exact rounding keeps collected equal to cost for this example', () => {
  const r = calcRatioMode(ratioInput({ rounding: 'exact' }))
  expect(r.players.map((p) => p.amount)).toEqual([78261, 78261, 39130, 52174, 52174])
  expect(r.totalCollected).toBe(300000)
  expect(r.surplus).toBe(0)
})

test('mode 1: all-male group splits evenly', () => {
  const r = calcRatioMode(
    ratioInput({
      players: [player({ name: 'A', gender: 'male' }), player({ name: 'B', gender: 'male' })],
    }),
  )
  expect(r.players.map((p) => p.amount)).toEqual([150000, 150000])
})

function hourlyInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'hourly',
    shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
    courtFee: 300000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', startTime: '20:00', endTime: '21:00' }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female', startTime: '19:00', endTime: '20:30' }),
    ],
    extras: [],
    ...over,
  }
}

test('mode 2: approved spec example (court 300k by hours, shuttle 150k by ratio)', () => {
  const r = calcHourlyMode(hourlyInput())
  expect(r.totalCost).toBe(450000)
  expect(r.players.map((p) => p.amount)).toEqual([106000, 106000, 70000, 94000, 77000])
  expect(r.players.map((p) => p.hours)).toEqual([2, 2, 1, 2, 1.5])
  expect(r.totalCollected).toBe(453000)
  expect(r.surplus).toBe(3000)
  expect(r.emptyHours).toBe(0)
  // breakdown shown in UI
  expect(r.players[0].courtShare).toBeCloseTo(70588.235, 2)
  expect(r.players[0].shuttleShare).toBeCloseTo(34615.385, 2)
})

test('mode 2: idle court time is split equally per head', () => {
  // court 19:00–21:00 fee 200k; both players 19:00–20:00 → 20:00–21:00 idle
  const r = calcHourlyMode(
    hourlyInput({
      courtFee: 200000,
      shuttles: [],
      players: [
        player({ name: 'A', gender: 'male', startTime: '19:00', endTime: '20:00' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '20:00' }),
      ],
    }),
  )
  expect(r.emptyHours).toBe(1)
  // idle 100k split equally (50k each) + played 100k split by hours (50k each)
  expect(r.players.map((p) => p.courtShare)).toEqual([100000, 100000])
})

test('mode 2: zero-hour player pays no court time but still pays shuttle', () => {
  const r = calcHourlyMode(
    hourlyInput({
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '19:00' }),
      ],
    }),
  )
  expect(r.players[1].courtShare).toBe(0)
  expect(r.players[1].shuttleShare).toBe(75000)
})

test('mode 2: overnight rental', () => {
  const r = calcHourlyMode(
    hourlyInput({
      courtStart: '23:00',
      courtEnd: '01:00',
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '23:30', endTime: '00:30' }),
      ],
    }),
  )
  expect(r.players.map((p) => p.hours)).toEqual([2, 1])
})

test('calcSession dispatches on mode', () => {
  expect(calcSession(ratioInput()).emptyHours).toBe(0)
  expect(calcSession(hourlyInput()).totalCost).toBe(450000)
})

test('validateSession catches invalid input', () => {
  expect(validateSession(ratioInput())).toEqual([])
  expect(validateSession(ratioInput({ players: [] }))).toContain('Cần ít nhất 1 người chơi')
  expect(
    validateSession(ratioInput({ shuttles: [], courtFee: 0 })),
  ).toContain('Tổng chi phải lớn hơn 0')
  expect(validateSession(ratioInput({ maleRatio: 0 }))).toContain('Hệ số phải lớn hơn 0')
  expect(validateSession(hourlyInput({ courtEnd: '19:00' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
  expect(
    validateSession(
      hourlyInput({
        players: [player({ name: 'A', gender: 'male', startTime: '18:00', endTime: '20:00' })],
      }),
    ),
  ).toContain('Giờ chơi của A nằm ngoài giờ thuê sân')
})

test('validateSession rejects a cleared court time input instead of letting NaN through', () => {
  expect(validateSession(hourlyInput({ courtStart: '' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
  expect(validateSession(hourlyInput({ courtEnd: '' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
})

test('validateSession rejects a cleared player time input instead of letting NaN through', () => {
  expect(
    validateSession(
      hourlyInput({
        players: [player({ name: 'A', gender: 'male', startTime: '', endTime: '21:00' })],
      }),
    ),
  ).toContain('Giờ chơi của A chưa đủ 2 mốc')
})

describe('chi phí phát sinh khác', () => {
  function extra(over: Partial<ExtraCost> = {}): ExtraCost {
    return {
      id: `e-${over.label ?? over.playerIds?.join('-') ?? '1'}`,
      label: 'Nước',
      amount: 0,
      playerIds: ['Hùng'],
      ...over,
    }
  }

  const twoMales = [player({ name: 'Hùng', gender: 'male' }), player({ name: 'Tuấn', gender: 'male' })]
  const threeMales = [
    player({ name: 'An', gender: 'male' }),
    player({ name: 'Bình', gender: 'male' }),
    player({ name: 'Cường', gender: 'male' }),
  ]
  const allThree = ['An', 'Bình', 'Cường']

  // 1
  test('an extra cost is charged in full to its owner and to nobody else', () => {
    const r = calcRatioMode(
      ratioInput({
        courtFee: 100000,
        shuttles: [],
        rounding: 'exact',
        players: twoMales,
        extras: [extra({ id: 'e1', label: 'Thuê vợt', amount: 20000, playerIds: ['Hùng'] })],
      }),
    )
    expect(r.players.map((p) => p.amount)).toEqual([70000, 50000])
    expect(r.players[0].extrasTotal).toBe(20000)
    expect(r.players[1].extrasTotal).toBe(0)
    expect(r.totalCost).toBe(120000)
    expect(r.surplus).toBe(0)
  })

  // 2
  test('extras are added BEFORE rounding, so they never trigger a second round-up', () => {
    // court 100.400 split between two equal males → 50.200 each
    const r = calcRatioMode(
      ratioInput({
        courtFee: 100400,
        shuttles: [],
        rounding: 'up1000',
        players: twoMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 500, playerIds: ['Hùng'] })],
      }),
    )
    expect(r.players[0].courtShare + r.players[0].shuttleShare).toBeCloseTo(50200, 6)
    expect(r.players[0].raw).toBeCloseTo(50700, 6)
    expect(r.players[0].amount).toBe(51000)
    expect(r.players[0].amount).not.toBe(52000)
  })

  // 3
  test('several extras on the same person add up into one extrasTotal', () => {
    const r = calcRatioMode(
      ratioInput({
        courtFee: 100000,
        shuttles: [],
        rounding: 'exact',
        players: twoMales,
        extras: [
          extra({ id: 'e1', label: 'Nước', amount: 15000, playerIds: ['Hùng'] }),
          extra({ id: 'e2', label: 'Thuê vợt', amount: 20000, playerIds: ['Hùng'] }),
        ],
      }),
    )
    expect(r.players[0].extrasTotal).toBe(35000)
    expect(r.players[0].raw).toBe(50000 + 35000)
  })

  // 4
  test('hourly court/shuttle splitting is untouched by extras', () => {
    const withoutExtras = calcHourlyMode(hourlyInput())
    const withExtras = calcHourlyMode(
      hourlyInput({ extras: [extra({ id: 'e1', amount: 20000, playerIds: ['Tuấn'] })] }),
    )
    expect(withExtras.players.map((p) => p.courtShare)).toEqual(
      withoutExtras.players.map((p) => p.courtShare),
    )
    expect(withExtras.players.map((p) => p.shuttleShare)).toEqual(
      withoutExtras.players.map((p) => p.shuttleShare),
    )
    expect(withExtras.players.map((p) => p.hours)).toEqual(withoutExtras.players.map((p) => p.hours))
    expect(withExtras.emptyHours).toBe(withoutExtras.emptyHours)
    // only the extras-derived figures move
    expect(withExtras.players[0].raw).toBe(withoutExtras.players[0].raw + 20000)
    expect(withExtras.totalCost).toBe(withoutExtras.totalCost + 20000)
    expect(withExtras.totalCollected).toBe(withoutExtras.totalCollected + 20000)
  })

  // 5
  test('totalCost includes extras and surplus stays totalCollected − totalCost in both modes', () => {
    const extras = [
      extra({ id: 'e1', label: 'Nước', amount: 15000, playerIds: ['Tuấn'] }),
      extra({ id: 'e2', label: 'Thuê vợt', amount: 20000, playerIds: ['Lan'] }),
    ]
    const ratio = calcRatioMode(ratioInput({ extras }))
    expect(ratio.totalCost).toBe(300000 + 35000)
    expect(ratio.surplus).toBe(ratio.totalCollected - ratio.totalCost)

    const hourly = calcHourlyMode(hourlyInput({ extras }))
    expect(hourly.totalCost).toBe(450000 + 35000)
    expect(hourly.surplus).toBe(hourly.totalCollected - hourly.totalCost)
  })

  // 6
  test('an orphaned extra (unknown playerId) inflates nobody and no total', () => {
    const clean = calcRatioMode(ratioInput({ players: twoMales }))
    const orphan = calcRatioMode(
      ratioInput({
        players: twoMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 99000, playerIds: ['ai-do-khong-co'] })],
      }),
    )
    expect(orphan.totalCost).toBe(clean.totalCost)
    expect(orphan.players.map((p) => p.raw)).toEqual(clean.players.map((p) => p.raw))
    expect(orphan.players.every((p) => p.extrasTotal === 0)).toBe(true)
  })

  // 7
  test('regression: an empty extras list reproduces the pre-feature result exactly', () => {
    const r = calcRatioMode(ratioInput({ extras: [] }))
    expect(r.totalCost).toBe(300000)
    expect(r.players.map((p) => p.amount)).toEqual([79000, 79000, 40000, 53000, 53000])
    expect(r.players.every((p) => p.extrasTotal === 0)).toBe(true)
    expect(r.players.map((p) => p.raw)).toEqual(
      r.players.map((p) => p.courtShare + p.shuttleShare),
    )
  })

  // 8
  test('validateSession flags a negative amount', () => {
    expect(
      validateSession(
        ratioInput({ extras: [extra({ id: 'e1', label: 'Nước', amount: -1, playerIds: ['Tuấn'] })] }),
      ),
    ).toContain('Số tiền của "Nước" chưa hợp lệ')
  })

  // 9
  test('validateSession flags an extra whose owner is not in the session', () => {
    expect(
      validateSession(
        ratioInput({ extras: [extra({ id: 'e1', label: 'Nước', amount: 1000, playerIds: ['xxx'] })] }),
      ),
    ).toContain('Khoản phát sinh "Nước" chưa chọn người trả')
  })

  // 10
  test('a blank label with amount 0 is deliberately NOT an error (rows are typed in gradually)', () => {
    expect(
      validateSession(
        ratioInput({ extras: [extra({ id: 'e1', label: '', amount: 0, playerIds: ['Tuấn'] })] }),
      ),
    ).toEqual([])
  })

  // 11
  test('a session whose only cost is an extra is not blocked by "Tổng chi phải lớn hơn 0"', () => {
    const errors = validateSession(
      ratioInput({
        courtFee: 0,
        shuttles: [],
        players: twoMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 20000, playerIds: ['Hùng'] })],
      }),
    )
    expect(errors).not.toContain('Tổng chi phải lớn hơn 0')
    expect(errors).toEqual([])
  })

  describe('khoản dùng chung — chia đều theo đầu người', () => {
    // 1
    test('an extra borne by the whole group is split equally per head', () => {
      const r = calcRatioMode(
        ratioInput({
          courtFee: 0,
          shuttles: [],
          rounding: 'exact',
          players: threeMales,
          extras: [extra({ id: 'e1', label: 'Nước', amount: 90000, playerIds: allThree })],
        }),
      )
      expect(r.players.map((p) => p.extrasTotal)).toEqual([30000, 30000, 30000])
      expect(r.totalCost).toBe(90000)
      expect(r.totalCollected).toBe(90000)
      expect(r.surplus).toBe(0)
    })

    // 2
    test('the awkward 100.000 / 3 case: the remainder dissolves into the existing rounding step', () => {
      const input = ratioInput({
        courtFee: 300000,
        shuttles: [],
        rounding: 'up1000',
        players: threeMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 100000, playerIds: allThree })],
      })
      const r = calcRatioMode(input)
      for (const p of r.players) {
        expect(p.courtShare).toBeCloseTo(100000, 6)
        expect(p.raw).toBeCloseTo(133333.333, 2)
        expect(p.amount).toBe(134000)
      }
      expect(r.totalCost).toBe(400000)
      expect(r.totalCollected).toBe(402000)
      expect(r.surplus).toBe(2000)

      // "giữ chính xác" rounds each raw DOWN here, which has always been able to
      // produce a small negative surplus — SurplusRow already renders that in red
      const exact = calcRatioMode({ ...input, rounding: 'exact' })
      expect(exact.players.map((p) => p.amount)).toEqual([133333, 133333, 133333])
      expect(exact.surplus).toBe(-1)
    })

    // 3
    test('a subset bears the whole amount between them; everyone else pays nothing for it', () => {
      const four = [...threeMales, player({ name: 'Dũng', gender: 'male' })]
      const r = calcRatioMode(
        ratioInput({
          courtFee: 0,
          shuttles: [],
          rounding: 'exact',
          players: four,
          extras: [extra({ id: 'e1', label: 'Nước', amount: 60000, playerIds: allThree })],
        }),
      )
      expect(r.players.map((p) => p.extrasTotal)).toEqual([20000, 20000, 20000, 0])
      expect(r.players[3].extras).toEqual([])
      // the full 60.000 still lands in totalCost, not 3/4 of it
      expect(r.totalCost).toBe(60000)
    })

    // 4
    test('invariant: the per-player shares always add back up to the untouched amount', () => {
      const divisible = ratioInput({
        players: threeMales,
        extras: [
          extra({ id: 'e1', label: 'Thuê vợt', amount: 20000, playerIds: ['An'] }),
          extra({ id: 'e2', label: 'Nước', amount: 90000, playerIds: allThree }),
        ],
      })
      const sum = (i: typeof divisible) =>
        i.players.reduce((s, p) => s + extrasOf(i, p.id), 0)
      expect(sum(divisible)).toBe(extrasTotal(divisible))
      expect(extrasTotal(divisible)).toBe(110000)

      // the same holds for an amount that does not divide evenly
      const awkward = ratioInput({
        players: threeMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 100000, playerIds: allThree })],
      })
      expect(sum(awkward)).toBeCloseTo(extrasTotal(awkward), 6)
    })

    // 6
    test('extraSharesOf carries the display metadata: sharedCount and a normalised label', () => {
      const input = ratioInput({
        players: threeMales,
        extras: [
          extra({ id: 'e1', label: 'Nước', amount: 90000, playerIds: allThree }),
          extra({ id: 'e2', label: 'Thuê vợt', amount: 20000, playerIds: ['An'] }),
          extra({ id: 'e3', label: '   ', amount: 5000, playerIds: ['An'] }),
        ],
      })
      expect(extraSharesOf(input, 'An')).toEqual([
        { label: 'Nước', share: 30000, sharedCount: 3 },
        { label: 'Thuê vợt', share: 20000, sharedCount: 1 },
        { label: 'Khoản khác', share: 5000, sharedCount: 1 },
      ])
      expect(extraSharesOf(input, 'Bình')).toEqual([
        { label: 'Nước', share: 30000, sharedCount: 3 },
      ])
    })

    // 9
    test('an extra that only partly matches real players is borne in full by the ones that do', () => {
      const input = ratioInput({
        courtFee: 0,
        shuttles: [],
        rounding: 'exact',
        players: twoMales,
        extras: [extra({ id: 'e1', label: 'Nước', amount: 60000, playerIds: ['Hùng', 'id-rac'] })],
      })
      const r = calcRatioMode(input)
      // the bogus id never becomes a denominator: Hùng alone bears 60.000
      expect(r.players[0].extrasTotal).toBe(60000)
      expect(r.players[0].extras).toEqual([{ label: 'Nước', share: 60000, sharedCount: 1 }])
      expect(r.players[1].extrasTotal).toBe(0)
      expect(r.totalCost).toBe(60000)
      expect(input.players.reduce((s, p) => s + extrasOf(input, p.id), 0)).toBe(extrasTotal(input))
    })

    // 10
    test('regression: v1.4.0 data (every extra a one-element set) reproduces the old numbers exactly', () => {
      const r = calcRatioMode(
        ratioInput({
          courtFee: 100000,
          shuttles: [],
          rounding: 'exact',
          players: twoMales,
          extras: [
            extra({ id: 'e1', label: 'Nước', amount: 15000, playerIds: ['Hùng'] }),
            extra({ id: 'e2', label: 'Thuê vợt', amount: 20000, playerIds: ['Tuấn'] }),
          ],
        }),
      )
      expect(r.players.map((p) => p.extrasTotal)).toEqual([15000, 20000])
      expect(r.players.map((p) => p.amount)).toEqual([65000, 70000])
      expect(r.players.every((p) => p.extras.every((x) => x.sharedCount === 1))).toBe(true)
      expect(r.totalCost).toBe(135000)
    })

    // 11
    test('validateSession flags an extra nobody was ticked for', () => {
      expect(
        validateSession(
          ratioInput({ extras: [extra({ id: 'e1', label: 'Nước', amount: 1000, playerIds: [] })] }),
        ),
      ).toContain('Khoản phát sinh "Nước" chưa chọn người trả')
    })

    // 13
    test('validateSession stays quiet when only SOME of the ids are unknown', () => {
      expect(
        validateSession(
          ratioInput({
            extras: [
              extra({ id: 'e1', label: 'Nước', amount: 1000, playerIds: ['Tuấn', 'id-rac'] }),
            ],
          }),
        ),
      ).toEqual([])
    })
  })
})

describe('nhiều loại cầu', () => {
  test('tiền cầu cộng mọi dòng', () => {
    const r = calcRatioMode(
      ratioInput({
        shuttles: [
          { id: 's1', name: 'Hải Yến', count: 4, price: 25000 },
          { id: 's2', name: 'Ba Sao', count: 2, price: 20000 },
        ],
      }),
    )
    // 100.000 + 40.000 cầu + 150.000 sân
    expect(r.totalCost).toBe(290000)
  })

  test('danh sách rỗng thì tiền cầu bằng 0', () => {
    const r = calcRatioMode(ratioInput({ shuttles: [] }))
    expect(r.totalCost).toBe(150000)
    expect(r.players.every((p) => p.shuttleShare === 0)).toBe(true)
  })

  test('gộp 2 dòng thành 1 dòng cùng tổng tiền cho ra phần chia y hệt', () => {
    const split = calcRatioMode(
      ratioInput({
        shuttles: [
          { id: 's1', name: 'Hải Yến', count: 4, price: 25000 },
          { id: 's2', name: 'Ba Sao', count: 2, price: 25000 },
        ],
      }),
    )
    const merged = calcRatioMode(
      ratioInput({ shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }] }),
    )
    expect(split.players.map((p) => p.shuttleShare)).toEqual(
      merged.players.map((p) => p.shuttleShare),
    )
  })

  test('validate: số lượng hoặc giá âm/NaN là lỗi, tên rỗng thì không', () => {
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: 'Ba Sao', count: -1, price: 20000 }] })),
    ).toContain('Số lượng/giá của "Ba Sao" chưa hợp lệ')
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: '', count: 1, price: Number.NaN }] })),
    ).toContain('Số lượng/giá của "loại cầu" chưa hợp lệ')
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }] })),
    ).toEqual([])
  })
})
