import { useEffect, useState } from 'react'
import { CostForm } from './components/CostForm'
import { HistoryPage } from './components/HistoryPage'
import { ModeSwitch } from './components/ModeSwitch'
import { PlayerList } from './components/PlayerList'
import { RatioInputs } from './components/RatioInputs'
import { ResultPanel } from './components/ResultPanel'
import { RoundingToggle } from './components/RoundingToggle'
import { calcSession, validateSession } from './lib/calc'
import {
  addToRoster,
  loadCurrentSession,
  loadHistory,
  loadRoster,
  loadSettings,
  saveCurrentSession,
  saveHistory,
  saveRoster,
  saveSettings,
  type RosterEntry,
  type SavedSession,
  type Settings,
} from './lib/storage'
import type { Gender, Player, SessionInput } from './lib/types'

function defaultSession(s: Settings): SessionInput {
  return {
    mode: s.mode,
    shuttleCount: 0,
    shuttlePrice: s.shuttlePrice,
    courtFee: 0,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: s.maleRatio,
    femaleRatio: s.femaleRatio,
    rounding: s.rounding,
    players: [],
  }
}

export default function App() {
  const [page, setPage] = useState<'main' | 'history'>('main')
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory())
  const [session, setSession] = useState<SessionInput>(
    () => loadCurrentSession() ?? defaultSession(loadSettings()),
  )

  useEffect(() => {
    saveCurrentSession(session)
    saveSettings({
      mode: session.mode,
      maleRatio: session.maleRatio,
      femaleRatio: session.femaleRatio,
      shuttlePrice: session.shuttlePrice,
      rounding: session.rounding,
    })
  }, [session])
  useEffect(() => saveRoster(roster), [roster])
  useEffect(() => saveHistory(history), [history])

  const onPatch = (p: Partial<SessionInput>) => setSession((s) => ({ ...s, ...p }))

  const handleAddPlayer = (name: string, gender: Gender) => {
    const player: Player = {
      id: crypto.randomUUID(),
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
    }
    setSession((s) => ({ ...s, players: [...s.players, player] }))
    setRoster((r) => addToRoster(r, name, gender))
  }

  const errors = validateSession(session)
  const result = errors.length === 0 ? calcSession(session) : null

  const handleSave = () => {
    if (!result) return
    setHistory((h) => [
      { id: crypto.randomUUID(), savedAt: new Date().toISOString(), input: session, result },
      ...h,
    ])
    setRoster((r) =>
      session.players.reduce((acc, p) => addToRoster(acc, p.name, p.gender), r),
    )
  }

  if (page === 'history') {
    return (
      <HistoryPage
        history={history}
        onBack={() => setPage('main')}
        onDelete={(id) => setHistory((h) => h.filter((s) => s.id !== id))}
        onReuse={(s) => {
          setSession((cur) => ({ ...cur, players: s.input.players }))
          setPage('main')
        }}
      />
    )
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] bg-gray-50 min-h-screen pb-8">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl">
          <h1 className="text-white text-2xl font-bold">🏸 Tính tiền cầu lông</h1>
          <p className="text-emerald-100 text-sm mt-1">Chia tiền nhanh sau buổi chơi</p>
        </header>
        <main className="px-4 -mt-2 space-y-4">
          <div className="mt-4">
            <ModeSwitch mode={session.mode} onChange={(mode) => onPatch({ mode })} />
          </div>
          <CostForm input={session} onPatch={onPatch} />
          <RatioInputs
            maleRatio={session.maleRatio}
            femaleRatio={session.femaleRatio}
            note={
              session.mode === 'hourly'
                ? 'Chỉ áp dụng cho tiền cầu — tiền sân chia theo giờ chơi'
                : undefined
            }
            onChange={onPatch}
          />
          <PlayerList
            input={session}
            roster={roster}
            onPatch={onPatch}
            onAddPlayer={handleAddPlayer}
          />
          <RoundingToggle rounding={session.rounding} onChange={(rounding) => onPatch({ rounding })} />
          <ResultPanel result={result} mode={session.mode} errors={errors} onSave={handleSave} />
          <button
            type="button"
            onClick={() => setPage('history')}
            className="w-full h-12 text-emerald-700 text-sm font-semibold"
          >
            Xem lịch sử các buổi →
          </button>
        </main>
      </div>
    </div>
  )
}
