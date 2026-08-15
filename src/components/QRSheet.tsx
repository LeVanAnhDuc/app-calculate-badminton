import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Drawer } from 'vaul'
import { BANKS, findBank } from '../lib/banks'
import { formatVND } from '../lib/format'
import { sharePlayerQR } from '../lib/qrCard'
import {
  loadCollectorAccount,
  saveCollectorAccount,
  type CollectorAccount,
} from '../lib/storage'
import { buildMemo, buildVietQRPayload } from '../lib/vietqr'
import { ShareIcon } from './icons'
import { QRImage } from './QRImage'

interface QRSheetProps {
  open: boolean
  onClose: () => void
  playerName: string
  amount: number
  memoDate: Date
  paid: boolean
  onTogglePaid: () => void
}

const ACCOUNT_NO_RE = /^[A-Za-z0-9]{4,19}$/

function AccountForm({ initial, onSaved }: { initial: CollectorAccount | null; onSaved: (a: CollectorAccount) => void }) {
  const [bankQuery, setBankQuery] = useState('')
  const [bankBin, setBankBin] = useState(initial?.bankBin ?? '')
  const [accountNo, setAccountNo] = useState(initial?.accountNo ?? '')
  const [accountName, setAccountName] = useState(initial?.accountName ?? '')

  const selectedBank = findBank(bankBin)
  const q = bankQuery.trim().toLowerCase()
  const filtered = q
    ? BANKS.filter((b) => `${b.shortName} ${b.name}`.toLowerCase().includes(q))
    : BANKS
  const valid = selectedBank !== undefined && ACCOUNT_NO_RE.test(accountNo)

  const submit = () => {
    if (!valid) return
    const account: CollectorAccount = {
      bankBin,
      accountNo,
      accountName: accountName.trim().toUpperCase(),
    }
    saveCollectorAccount(account)
    onSaved(account)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Nhập tài khoản nhận tiền một lần — app sẽ dùng cho mọi buổi sau.
      </p>
      {selectedBank ? (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
          <span className="font-semibold text-gray-900">{selectedBank.shortName}</span>
          <button type="button" className="text-sm text-emerald-700 font-semibold" onClick={() => setBankBin('')}>
            Đổi
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Tìm ngân hàng"
            value={bankQuery}
            onChange={(e) => setBankQuery(e.target.value)}
            className="w-full h-12 rounded-xl border border-gray-300 px-3"
          />
          <ul className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filtered.map((b) => (
              <li key={b.bin}>
                <button
                  type="button"
                  onClick={() => setBankBin(b.bin)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">{b.shortName}</span>{' '}
                  <span className="text-xs text-gray-400">{b.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-gray-400">Không tìm thấy ngân hàng</li>
            )}
          </ul>
        </>
      )}
      <input
        type="text"
        inputMode="numeric"
        placeholder="Số tài khoản"
        value={accountNo}
        onChange={(e) => setAccountNo(e.target.value.trim())}
        className="w-full h-12 rounded-xl border border-gray-300 px-3"
      />
      <input
        type="text"
        placeholder="Tên chủ tài khoản (không bắt buộc)"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        className="w-full h-12 rounded-xl border border-gray-300 px-3"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={submit}
        className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold disabled:bg-gray-300"
      >
        Lưu tài khoản
      </button>
    </div>
  )
}

/**
 * Bottom sheet hiển thị mã VietQR cho một người chơi. Lần đầu (chưa có tài
 * khoản người thu) hiện form thiết lập ngay trong sheet; sau đó hiện QR +
 * nút "Đã trả" để khép kín vòng chia tiền → quét → tick.
 */
export function QRSheet({ open, onClose, playerName, amount, memoDate, paid, onTogglePaid }: QRSheetProps) {
  const [account, setAccount] = useState<CollectorAccount | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (open) {
      const a = loadCollectorAccount()
      setAccount(a)
      setEditing(a === null)
    }
  }, [open])

  const memo = buildMemo(memoDate, playerName)
  const bank = account ? findBank(account.bankBin) : undefined

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o: boolean) => {
        if (!o) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl bg-white outline-none">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="max-w-lg mx-auto p-4 pb-6">
            <Drawer.Title className="font-bold text-gray-900 mb-1 text-center">
              {editing ? 'Tài khoản nhận tiền' : `Quét để trả — ${playerName}`}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Mã VietQR để chuyển khoản tiền cầu lông
            </Drawer.Description>

            {editing || account === null ? (
              <AccountForm
                initial={account}
                onSaved={(a) => {
                  setAccount(a)
                  setEditing(false)
                }}
              />
            ) : (
              <div className="flex flex-col items-center">
                <QRImage
                  payload={buildVietQRPayload({
                    bankBin: account.bankBin,
                    accountNo: account.accountNo,
                    amount,
                    memo,
                  })}
                  label={`Mã VietQR cho ${playerName}`}
                />
                <p className="mt-3 text-2xl font-bold text-gray-900">{formatVND(amount)}</p>
                <p className="text-sm text-gray-500">{memo}</p>
                {/* one template string → one DOM text node, so getByText(regex) matches */}
                <p className="mt-2 text-xs text-gray-400">
                  {`Chuyển tới: ${bank?.shortName ?? account.bankBin} · ${account.accountNo}${
                    account.accountName ? ` · ${account.accountName}` : ''
                  }`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePaid()
                    onClose()
                  }}
                  className={`w-full h-12 mt-4 rounded-xl font-bold ${
                    paid
                      ? 'border border-gray-300 text-gray-600'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {paid ? 'Bỏ đánh dấu đã trả' : '✓ Đã trả'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // sheet vẫn mở và không tự tick "đã trả": gửi QR ≠ đã nhận tiền
                    const outcome = await sharePlayerQR({ playerName, amount, memoDate, account })
                    // 'shared'/'cancelled' đã được share sheet của máy phản hồi rồi
                    if (outcome === 'downloaded') toast.success(`Đã tải ảnh QR của ${playerName}`)
                  }}
                  className="w-full h-12 mt-2 rounded-xl font-bold border border-emerald-600 text-emerald-700 flex items-center justify-center gap-2"
                >
                  <ShareIcon /> Chia sẻ QR
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm text-gray-400 underline"
                >
                  Sửa tài khoản
                </button>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
