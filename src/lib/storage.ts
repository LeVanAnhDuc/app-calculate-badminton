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
  rounding: 'up1000',
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
  (v.rounding === 'up1000' || v.rounding === 'exact')

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

/** Di trú mềm: {playerId: 'x'} → {playerIds: ['x']}. Destructure bỏ hẳn khóa cũ để
 *  lần save kế tiếp không ghi lại `playerId` mồ côi vào localStorage. */
function normalizeExtra(e: StoredExtraCost): ExtraCost {
  const { playerId, playerIds, ...rest } = e
  return { ...rest, playerIds: playerIds ?? (playerId ? [playerId] : []) }
}

/** Di trú mềm: buổi cũ không có `extras` → mảng rỗng. Không làm mất trường khác. */
function normalizeSession(s: SessionInput): SessionInput {
  return {
    ...s,
    players: s.players.map(normalizePlayer),
    extras: (s.extras ?? []).map((e) => normalizeExtra(e as StoredExtraCost)),
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
  typeof v.shuttleCount === 'number' &&
  typeof v.shuttlePrice === 'number' &&
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

export const loadSettings = (): Settings => load('settings', isSettings, DEFAULT_SETTINGS)
export const saveSettings = (s: Settings): boolean => save('settings', s)

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
