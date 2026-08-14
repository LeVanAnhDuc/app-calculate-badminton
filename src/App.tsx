import { useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { Toaster, toast } from 'sonner'
import { CostForm } from './components/CostForm'
import { HistoryPage } from './components/HistoryPage'
import { ModeSwitch } from './components/ModeSwitch'
import { PlayerList } from './components/PlayerList'
import { RatioInputs } from './components/RatioInputs'
import { ResultPanel } from './components/ResultPanel'
import { RosterPage } from './components/RosterPage'
import { RoundingToggle } from './components/RoundingToggle'
import { calcSession, validateSession } from './lib/calc'
import { insertAt, toastUndo } from './lib/undo'
import {
  addToRoster,
  HISTORY_LIMIT,
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

const uid = (): string =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

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
  const [page, setPage] = useState<'main' | 'history' | 'roster'>('main')
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory())
  const [session, setSession] = useState<SessionInput>(
    () => loadCurrentSession() ?? defaultSession(loadSettings()),
  )

  useEffect(() => {
    const onPopState = () => setPage('main')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openHistory = () => {
    window.history.pushState({ page: 'history' }, '')
    setPage('history')
  }

  const openRoster = () => {
    window.history.pushState({ page: 'roster' }, '')
    setPage('roster')
  }

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
  useEffect(() => {
    saveRoster(roster)
  }, [roster])
  const historySaveOkRef = useRef(true)
  useEffect(() => {
    const ok = saveHistory(history)
    if (!ok && historySaveOkRef.current) {
      toast.error('Không lưu được lịch sử — bộ nhớ trình duyệt đầy')
    }
    historySaveOkRef.current = ok
  }, [history])

  const onPatch = (p: Partial<SessionInput>) => setSession((s) => ({ ...s, ...p }))

  const handleAddPlayer = (name: string, gender: Gender) => {
    const player: Player = {
      id: uid(),
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
      paid: false,
    }
    setSession((s) => ({ ...s, players: [...s.players, player] }))
    setRoster((r) => addToRoster(r, name, gender))
  }

  const handleChangeGender = (playerId: string, gender: Gender) => {
    const player = session.players.find((p) => p.id === playerId)
    if (!player) return
    setSession((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, gender } : p)),
    }))
    setRoster((r) => addToRoster(r, player.name, gender))
  }

  // Deletes are undoable rather than confirmed up front. The undo callbacks
  // always go through the functional updater form so that anything changed
  // while the toast is on screen survives — undo re-inserts the one removed
  // item, it never restores a stale snapshot of the whole list.
  const handleRemovePlayer = (playerId: string) => {
    const index = session.players.findIndex((p) => p.id === playerId)
    if (index === -1) return
    const removed = session.players[index]
    setSession((s) => ({ ...s, players: s.players.filter((p) => p.id !== playerId) }))
    toastUndo(`Đã xóa "${removed.name}"`, () =>
      setSession((s) => ({ ...s, players: insertAt(s.players, index, removed) })),
    )
  }

  const handleDeleteSavedSession = (id: string) => {
    const index = history.findIndex((s) => s.id === id)
    if (index === -1) return
    const removed = history[index]
    setHistory((h) => h.filter((s) => s.id !== id))
    toastUndo('Đã xóa buổi này', () => setHistory((h) => insertAt(h, index, removed)))
  }

  const handleRenamePlayer = (playerId: string, newName: string) => {
    const player = session.players.find((p) => p.id === playerId)
    if (!player) return
    setSession((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, name: newName } : p)),
    }))
    setRoster((r) => addToRoster(r, newName, player.gender))
  }

  const errors = validateSession(session)
  const result = errors.length === 0 ? calcSession(session) : null

  const [saveDisabled, setSaveDisabled] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    },
    [],
  )

  const handleNewSession = () => {
    const previous = session
    setSession(defaultSession(loadSettings()))
    // Nothing was entered yet — there is nothing worth offering to undo.
    const isEmpty =
      previous.players.length === 0 && previous.courtFee === 0 && previous.shuttleCount === 0
    if (isEmpty) return
    // The only site that restores a whole snapshot: a reset has no single
    // removed element to put back.
    toastUndo('Đã bắt đầu buổi mới', () => setSession(previous))
  }

  const handleSave = () => {
    if (!result) return
    const isFiniteResult =
      Number.isFinite(result.surplus) && result.players.every((p) => Number.isFinite(p.amount))
    if (!isFiniteResult) return
    setHistory((h) =>
      [{ id: uid(), savedAt: new Date().toISOString(), input: session, result }, ...h].slice(
        0,
        HISTORY_LIMIT,
      ),
    )
    setRoster((r) =>
      session.players.reduce((acc, p) => addToRoster(acc, p.name, p.gender), r),
    )
    toast.success('Đã lưu buổi ✓')
    setSaveDisabled(true)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveDisabled(false), 2500)
  }

  if (page === 'roster') {
    return (
      <MotionConfig reducedMotion="user">
        <Toaster position="top-center" />
        <RosterPage roster={roster} onBack={() => window.history.back()} onChange={setRoster} />
      </MotionConfig>
    )
  }

  if (page === 'history') {
    return (
      <MotionConfig reducedMotion="user">
        <Toaster position="top-center" />
        <HistoryPage
          history={history}
          onBack={() => window.history.back()}
          onDelete={handleDeleteSavedSession}
          onTogglePaid={(sessionId, playerId) =>
            setHistory((h) =>
              h.map((s) =>
                s.id !== sessionId
                  ? s
                  : {
                      ...s,
                      input: {
                        ...s.input,
                        players: s.input.players.map((p) =>
                          p.id === playerId ? { ...p, paid: !p.paid } : p,
                        ),
                      },
                    },
              ),
            )
          }
          onReuse={(s) => {
            setSession((cur) => ({
              ...cur,
              players: s.input.players.map((p) => ({
                id: uid(),
                name: p.name,
                gender: p.gender,
                halfSession: false,
                startTime: null,
                endTime: null,
                paid: false,
              })),
            }))
            setPage('main')
          }}
        />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <Toaster position="top-center" />
      <div className="bg-gray-100 min-h-screen">
        <div className="max-w-[390px] mx-auto bg-gray-50 min-h-screen pb-8 md:max-w-none md:bg-gray-100 md:pb-0">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl md:rounded-none md:px-0 md:py-5">
          <div className="md:max-w-5xl md:mx-auto md:px-6 md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-white text-2xl font-bold">🏸 Tính tiền cầu lông</h1>
              <p className="text-emerald-100 text-sm mt-1">Chia tiền nhanh sau buổi chơi</p>
            </div>
            <div className="hidden md:flex md:gap-2">
              <button
                type="button"
                onClick={openHistory}
                className="h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
              >
                Lịch sử các buổi
              </button>
              <button
                type="button"
                onClick={openRoster}
                className="h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
              >
                Danh bạ
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 -mt-2 space-y-4 md:max-w-5xl md:mx-auto md:px-6 md:mt-0 md:py-6 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 md:items-start">
          <div className="mt-4 md:mt-0 md:col-span-5 md:max-w-md">
            <ModeSwitch mode={session.mode} onChange={(mode) => onPatch({ mode })} />
          </div>
          <div className="space-y-4 mt-4 md:mt-0 md:col-span-3">
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
              onRemovePlayer={handleRemovePlayer}
              onChangeGender={handleChangeGender}
              onRenamePlayer={handleRenamePlayer}
            />
            <RoundingToggle
              rounding={session.rounding}
              onChange={(rounding) => onPatch({ rounding })}
            />
          </div>
          <div className="mt-4 md:mt-0 md:col-span-2 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto space-y-4">
            <ResultPanel
              result={result}
              mode={session.mode}
              errors={errors}
              players={session.players}
              onSave={handleSave}
              onNewSession={handleNewSession}
              onPatch={onPatch}
              saveDisabled={saveDisabled}
            />
            <button
              type="button"
              onClick={openHistory}
              className="w-full h-12 text-emerald-700 text-sm font-semibold md:hidden"
            >
              Xem lịch sử các buổi →
            </button>
            <button
              type="button"
              onClick={openRoster}
              className="w-full h-12 text-emerald-700 text-sm font-semibold md:hidden"
            >
              Danh bạ người chơi →
            </button>
          </div>
        </main>
        </div>
      </div>
    </MotionConfig>
  )
}
