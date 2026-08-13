import type { CalcResult, Gender, Mode, Rounding, SessionInput } from './types'

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

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/unavailable — app keeps working in memory
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

const isSession = (v: unknown): boolean =>
  isObject(v) && (v.mode === 'ratio' || v.mode === 'hourly') && Array.isArray(v.players)

const isHistory = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every((e) => isObject(e) && typeof e.id === 'string' && isSession(e.input))

export const loadRoster = (): RosterEntry[] => load('roster', isRoster, [])
export const saveRoster = (r: RosterEntry[]): void => save('roster', r)

export function addToRoster(roster: RosterEntry[], name: string, gender: Gender): RosterEntry[] {
  const trimmed = name.trim()
  const key = trimmed.toLowerCase()
  return [...roster.filter((r) => r.name.toLowerCase() !== key), { name: trimmed, gender }]
}

export const loadSettings = (): Settings => load('settings', isSettings, DEFAULT_SETTINGS)
export const saveSettings = (s: Settings): void => save('settings', s)

export const loadCurrentSession = (): SessionInput | null =>
  load<SessionInput | null>('currentSession', isSession, null)
export const saveCurrentSession = (s: SessionInput): void => save('currentSession', s)

export const loadHistory = (): SavedSession[] => load('history', isHistory, [])
export const saveHistory = (h: SavedSession[]): void => save('history', h)
