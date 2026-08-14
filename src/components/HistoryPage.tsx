import { Fragment, useEffect, useState } from 'react'
import { formatVND } from '../lib/format'
import { paidCount } from '../lib/settlement'
import type { SavedSession } from '../lib/storage'
import { formatHours } from '../lib/time'
import { durationHours } from '../lib/time'
import { PaidToggle } from './PaidToggle'
import { QRSheet } from './QRSheet'
import { PaidSummaryLine, SurplusRow, TotalCollectedRow } from './ResultPanel'
import { CopyTextButton, ShareImageButton } from './ShareButtons'

function QRIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}

interface Props {
  history: SavedSession[]
  onBack: () => void
  onDelete: (id: string) => void
  onTogglePaid: (sessionId: string, playerId: string) => void
  onReuse: (s: SavedSession) => void
}

function sessionDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function monthLabel(iso: string): string {
  const d = new Date(iso)
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
}

export function HistoryPage({ history, onBack, onDelete, onTogglePaid, onReuse }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [qrTarget, setQrTarget] = useState<{ sessionId: string; playerId: string } | null>(null)

  // cards never auto-expand; this only guards against a deleted card
  // staying "expanded" once it no longer exists in history
  useEffect(() => {
    if (expandedId !== null && !history.some((s) => s.id === expandedId)) {
      setExpandedId(null)
    }
  }, [history, expandedId])

  const now = new Date()
  const thisMonth = history.filter((s) => {
    const d = new Date(s.savedAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] md:max-w-5xl bg-gray-50 min-h-screen pb-8">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl md:rounded-none">
          <div className="flex items-center gap-3 md:max-w-5xl md:mx-auto">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xl shrink-0"
            >
              ←
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Lịch sử các buổi</h1>
              <p className="text-emerald-100 text-sm">
                {history.length} buổi đã lưu · tháng này: {thisMonth} buổi
              </p>
            </div>
          </div>
        </header>

        <main className="px-4 mt-4 space-y-3 md:max-w-5xl md:mx-auto md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
          {history.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8 md:col-span-2">
              Chưa có buổi nào được lưu — quay lại màn hình chính và bấm "Lưu buổi này".
            </p>
          )}
          {history.map((s, i) => {
            const males = s.input.players.filter((p) => p.gender === 'male').length
            const females = s.input.players.length - males
            const unpaidPlayerCount = s.input.players.length - paidCount(s.input.players)
            const expanded = expandedId === s.id
            const showMonthHeader = i === 0 || monthKey(s.savedAt) !== monthKey(history[i - 1].savedAt)
            return (
              <Fragment key={s.id}>
                {showMonthHeader && (
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mt-2 first:mt-0 md:col-span-2">
                    {monthLabel(s.savedAt)}
                  </h2>
                )}
                <section
                  className={`bg-white rounded-2xl shadow-sm ${
                    expanded ? 'border-2 border-emerald-200 md:col-span-2' : ''
                  }`}
                >
                <button
                  type="button"
                  className="w-full p-4 flex items-center justify-between text-left"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                >
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">{sessionDate(s.savedAt)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>
                        {s.input.players.length} người · {males} nam, {females} nữ
                      </span>
                      {unpaidPlayerCount > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                          ⚠ {unpaidPlayerCount} chưa trả
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-emerald-600">
                      {formatVND(s.result.totalCost)}
                    </div>
                    <div className="text-xs text-gray-400">{expanded ? '▲ thu gọn' : '▼ chi tiết'}</div>
                  </div>
                </button>

                {expanded && (
                  <>
                    <div className="border-t border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Chi phí</h3>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Tiền cầu ({s.input.shuttleCount} quả × {formatVND(s.input.shuttlePrice)})
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatVND(s.input.shuttleCount * s.input.shuttlePrice)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tiền sân</span>
                            <span className="font-semibold text-gray-900">{formatVND(s.input.courtFee)}</span>
                          </div>
                          {s.input.extras.map((e) => (
                            <div key={e.id} className="flex justify-between text-sm">
                              <span className="text-gray-500">
                                {e.label.trim() || 'Khoản khác'} ·{' '}
                                {s.input.players.find((p) => p.id === e.playerId)?.name ?? '?'}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {formatVND(e.amount)}
                              </span>
                            </div>
                          ))}
                          {s.input.mode === 'hourly' && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Giờ thuê sân</span>
                              <span className="font-semibold text-gray-900">
                                {s.input.courtStart}–{s.input.courtEnd} (
                                {formatHours(durationHours(s.input.courtStart, s.input.courtEnd))})
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Chế độ tính</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.mode === 'ratio' ? 'Chia theo tỉ lệ' : 'Sân theo giờ'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Hệ số nam / nữ</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.maleRatio} / {s.input.femaleRatio}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Làm tròn</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.rounding === 'up1000' ? 'Tròn lên 1.000đ' : 'Giữ chính xác'}
                            </span>
                          </div>
                          <TotalCollectedRow total={s.result.totalCollected} />
                          <SurplusRow surplus={s.result.surplus} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Mỗi người trả</h3>
                        <div className="mb-2">
                          <PaidSummaryLine players={s.input.players} results={s.result.players} />
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm">
                          {s.result.players.map((p) => {
                            const paid = s.input.players.find((pl) => pl.id === p.playerId)?.paid ?? false
                            return (
                              <li
                                key={p.playerId}
                                className={`flex justify-between items-center rounded-lg px-3 py-2 transition-colors duration-200 ${
                                  paid ? 'bg-emerald-50' : 'bg-gray-50'
                                }`}
                              >
                                <span className="flex items-center gap-2 text-gray-900">
                                  <PaidToggle
                                    paid={paid}
                                    name={p.name}
                                    onToggle={() => onTogglePaid(s.id, p.playerId)}
                                  />
                                  <span>
                                    {p.name}{' '}
                                    <span className="text-xs text-gray-400">
                                      ({p.gender === 'male' ? 'Nam' : 'Nữ'}
                                      {s.input.mode === 'ratio' && p.halfSession ? ' · ½ buổi' : ''}
                                      {p.hours !== null ? ` · ${formatHours(p.hours)}` : ''}
                                      {p.extrasTotal > 0
                                        ? ` · +${formatVND(p.extrasTotal)} phát sinh`
                                        : ''}
                                      )
                                    </span>
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    aria-label={`Mã QR cho ${p.name}`}
                                    title={`Mã QR cho ${p.name}`}
                                    onClick={() => setQrTarget({ sessionId: s.id, playerId: p.playerId })}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                                  >
                                    <QRIcon />
                                  </button>
                                  <span className="font-bold">{formatVND(p.amount)}</span>
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      <div className="flex gap-2">
                        <ShareImageButton
                          result={s.result}
                          mode={s.input.mode}
                          players={s.input.players}
                          date={new Date(s.savedAt)}
                          variant="wide"
                        />
                        <CopyTextButton
                          result={s.result}
                          mode={s.input.mode}
                          players={s.input.players}
                          date={new Date(s.savedAt)}
                          variant="wide"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-0 md:flex md:gap-2">
                        <button
                          type="button"
                          onClick={() => onReuse(s)}
                          className="w-full md:flex-1 h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                        >
                          Dùng lại danh sách này cho buổi mới
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(s.id)}
                          className="w-full md:w-auto md:px-4 h-12 rounded-xl border border-red-200 text-red-500 text-sm font-semibold"
                        >
                          Xóa buổi này
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
              </Fragment>
            )
          })}
          {(() => {
            if (qrTarget === null) return null
            const s = history.find((x) => x.id === qrTarget.sessionId)
            const pr = s?.result.players.find((p) => p.playerId === qrTarget.playerId)
            if (!s || !pr) return null
            const paid = s.input.players.find((pl) => pl.id === pr.playerId)?.paid ?? false
            return (
              <QRSheet
                open
                onClose={() => setQrTarget(null)}
                playerName={pr.name}
                amount={pr.amount}
                memoDate={new Date(s.savedAt)}
                paid={paid}
                onTogglePaid={() => onTogglePaid(s.id, pr.playerId)}
              />
            )
          })()}
          <p className="text-center text-xs text-gray-400 pt-3 md:col-span-2">
            Dữ liệu lưu trên máy của bạn (localStorage)
            <br />
            Tự động giữ tối đa 500 buổi gần nhất — buổi cũ hơn sẽ được xóa dần
          </p>
        </main>
      </div>
    </div>
  )
}
