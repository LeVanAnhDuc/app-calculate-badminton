import type {
  CalcResult,
  ExtraCost,
  Gender,
  Mode,
  Player,
  Rounding,
  SessionInput,
} from './types'

export interface RosterEntry {
  name: string
  gender: Gender
}

export interface Settings {
  mode: Mode
  maleRatio: number
  femaleRatio: number
  shuttlePrice: number
  shuttleName: string
  rounding: Rounding
}

export interface SavedSession {
  id: string
  savedAt: string
  input: SessionInput
  result: CalcResult
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'ratio',
  maleRatio: 1.5,
  femaleRatio: 1.0,
  shuttlePrice: 25000,
  shuttleName: '',
  rounding: 'up1000',
}

/** Tài khoản người thu tiền — nhập một lần, dùng sinh VietQR cho mọi buổi. */
export interface CollectorAccount {
  bankBin: string
  accountNo: string
  accountName: string // chỉ để hiển thị cho người trả đối chiếu; '' nếu bỏ trống
}

function load<T>(key: string, guard: (v: unknown) => boolean, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return guard(parsed) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // storage full/unavailable — app keeps working in memory
    return false
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isRoster = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      isObject(e) && typeof e.name === 'string' && (e.gender === 'male' || e.gender === 'female'),
  )

const isSettings = (v: unknown): boolean =>
  isObject(v) &&
  (v.mode === 'ratio' || v.mode === 'hourly') &&
  typeof v.maleRatio === 'number' &&
  typeof v.femaleRatio === 'number' &&
  typeof v.shuttlePrice === 'number' &&
  // migration: settings cũ không có `shuttleName` — loadSettings() điền '' khi load.
  (typeof v.shuttleName === 'string' || v.shuttleName === undefined) &&
  (v.rounding === 'up1000' || v.rounding === 'exact')

const isCollectorAccount = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.bankBin === 'string' &&
  typeof v.accountNo === 'string' &&
  typeof v.accountName === 'string'

const isPlayer = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  (v.gender === 'male' || v.gender === 'female') &&
  typeof v.halfSession === 'boolean' &&
  (typeof v.startTime === 'string' || v.startTime === null) &&
  (typeof v.endTime === 'string' || v.endTime === null) &&
  // migration: dữ liệu cũ không có trường `paid` — chấp nhận boolean hoặc undefined,
  // normalizePlayer() sẽ điền paid: false khi load. Không được để guard này bác dữ liệu cũ.
  (typeof v.paid === 'boolean' || v.paid === undefined)

/** Di trú mềm: dữ liệu cũ không có `paid` → mặc định false. Không làm mất trường khác. */
function normalizePlayer(p: Player): Player {
  return { ...p, paid: p.paid ?? false }
}

/** Hình dạng đọc từ localStorage: v1.4.0 có `playerId`, từ v1.5.0 có `playerIds`. */
type StoredExtraCost = Omit<ExtraCost, 'playerIds'> & {
  playerId?: string
  playerIds?: string[]
}

/** Trường cũ chỉ tồn tại trong dữ liệu đã lưu trước tính năng nhiều loại cầu. */
type LegacySession = SessionInput & { shuttleCount?: number; shuttlePrice?: number }

/** Di trú mềm: {playerId: 'x'} → {playerIds: ['x']}. Destructure bỏ hẳn khóa cũ để
 *  lần save kế tiếp không ghi lại `playerId` mồ côi vào localStorage. */
function normalizeExtra(e: StoredExtraCost): ExtraCost {
  const { playerId, playerIds, ...rest } = e
  return { ...rest, playerIds: playerIds ?? (playerId ? [playerId] : []) }
}

/**
 * Di trú mềm: buổi cũ không có `extras` → mảng rỗng; một cặp số lượng/giá cầu →
 * đúng một dòng cầu. Không làm mất trường khác.
 */
function normalizeSession(s: LegacySession): SessionInput {
  const { shuttleCount, shuttlePrice, ...rest } = s
  return {
    ...rest,
    players: s.players.map(normalizePlayer),
    extras: (s.extras ?? []).map((e) => normalizeExtra(e as StoredExtraCost)),
    shuttles: s.shuttles ?? [
      { id: LEGACY_SHUTTLE_ID, name: '', count: shuttleCount ?? 0, price: shuttlePrice ?? 0 },
    ],
  }
}

/** Di trú mềm: kết quả cũ không có `extrasTotal`/`extras` → 0 và []. Số tiền đã lưu
 *  giữ nguyên tuyệt đối — không tính lại bao giờ. */
function normalizeResult(r: CalcResult): CalcResult {
  return {
    ...r,
    players: r.players.map((p) => ({ ...p, extrasTotal: p.extrasTotal ?? 0, extras: p.extras ?? [] })),
  }
}

/** Buổi cũ chỉ có 1 loại cầu — id cố định để mỗi lần load ra cùng một React key. */
export const LEGACY_SHUTTLE_ID = 'shuttle-legacy'

const isShuttleLine = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.count === 'number' &&
  typeof v.price === 'number'

const isExtraCost = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.label === 'string' &&
  typeof v.amount === 'number' &&
  // migration v1.4.0 → v1.5.0: dữ liệu cũ có `playerId: string`, dữ liệu mới có
  // `playerIds: string[]`. Chấp nhận CẢ HAI; normalizeExtra() gộp về playerIds khi load.
  // Không được để guard này bác dữ liệu cũ.
  ((Array.isArray(v.playerIds) && v.playerIds.every((id) => typeof id === 'string')) ||
    typeof v.playerId === 'string')

const isExtraShare = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.label === 'string' &&
  typeof v.share === 'number' &&
  typeof v.sharedCount === 'number'

const isSession = (v: unknown): boolean =>
  isObject(v) &&
  (v.mode === 'ratio' || v.mode === 'hourly') &&
  // migration: buổi cũ có shuttleCount/shuttlePrice, buổi mới có mảng `shuttles`.
  // Chấp nhận cả hai; normalizeSession() quy đổi dạng cũ khi load.
  (v.shuttles === undefined
    ? typeof v.shuttleCount === 'number' && typeof v.shuttlePrice === 'number'
    : Array.isArray(v.shuttles) && v.shuttles.every((l) => isShuttleLine(l))) &&
  typeof v.courtFee === 'number' &&
  typeof v.courtStart === 'string' &&
  typeof v.courtEnd === 'string' &&
  typeof v.maleRatio === 'number' &&
  typeof v.femaleRatio === 'number' &&
  (v.rounding === 'up1000' || v.rounding === 'exact') &&
  Array.isArray(v.players) &&
  v.players.every((p) => isPlayer(p)) &&
  // migration: dữ liệu cũ không có trường `extras` — chấp nhận mảng hợp lệ hoặc undefined,
  // normalizeSession() sẽ điền extras: [] khi load.
  (v.extras === undefined || (Array.isArray(v.extras) && v.extras.every((e) => isExtraCost(e))))

const isPlayerResult = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.playerId === 'string' &&
  typeof v.name === 'string' &&
  (v.gender === 'male' || v.gender === 'female') &&
  typeof v.halfSession === 'boolean' &&
  (typeof v.hours === 'number' || v.hours === null) &&
  typeof v.courtShare === 'number' &&
  typeof v.shuttleShare === 'number' &&
  typeof v.raw === 'number' &&
  typeof v.amount === 'number' &&
  // migration: kết quả đã lưu trước tính năng này không có `extrasTotal` — chấp nhận
  // number hoặc undefined, normalizeResult() điền 0 khi load.
  (typeof v.extrasTotal === 'number' || v.extrasTotal === undefined) &&
  // migration: kết quả lưu bởi v1.4.0 không có `extras` — chấp nhận mảng hợp lệ hoặc
  // undefined, normalizeResult() điền [] khi load.
  (v.extras === undefined || (Array.isArray(v.extras) && v.extras.every((e) => isExtraShare(e))))

const isCalcResult = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.totalCost === 'number' &&
  typeof v.totalCollected === 'number' &&
  typeof v.surplus === 'number' &&
  typeof v.emptyHours === 'number' &&
  Array.isArray(v.players) &&
  v.players.every((p) => isPlayerResult(p))

const isSavedSession = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.savedAt === 'string' &&
  isSession(v.input) &&
  isCalcResult(v.result)

export const loadRoster = (): RosterEntry[] => load('roster', isRoster, [])
export const saveRoster = (r: RosterEntry[]): boolean => save('roster', r)

export function addToRoster(roster: RosterEntry[], name: string, gender: Gender): RosterEntry[] {
  const trimmed = name.trim()
  const key = trimmed.toLowerCase()
  return [...roster.filter((r) => r.name.toLowerCase() !== key), { name: trimmed, gender }]
}

export function loadSettings(): Settings {
  const s = load<Settings>('settings', isSettings, DEFAULT_SETTINGS)
  return { ...s, shuttleName: s.shuttleName ?? '' }
}
export const saveSettings = (s: Settings): boolean => save('settings', s)

export const loadCollectorAccount = (): CollectorAccount | null =>
  load<CollectorAccount | null>('collectorAccount', isCollectorAccount, null)
export const saveCollectorAccount = (a: CollectorAccount): boolean => save('collectorAccount', a)

export function loadCurrentSession(): SessionInput | null {
  const s = load<SessionInput | null>('currentSession', isSession, null)
  return s ? normalizeSession(s) : null
}
export const saveCurrentSession = (s: SessionInput): boolean => save('currentSession', s)

export const HISTORY_LIMIT = 500

export function loadHistory(): SavedSession[] {
  try {
    const raw = localStorage.getItem('history')
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    const valid = Array.isArray(parsed) ? (parsed.filter(isSavedSession) as SavedSession[]) : []
    return valid
      .slice(0, HISTORY_LIMIT)
      .map((s) => ({ ...s, input: normalizeSession(s.input), result: normalizeResult(s.result) }))
  } catch {
    return []
  }
}

export const saveHistory = (h: SavedSession[]): boolean => save('history', h.slice(0, HISTORY_LIMIT))

export const loadInstallDismissed = (): boolean =>
  load('installDismissed', (v) => typeof v === 'boolean', false)
export const saveInstallDismissed = (v: boolean): boolean => save('installDismissed', v)
