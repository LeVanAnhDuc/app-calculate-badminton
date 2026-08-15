import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { sharePlayerQR } from '../lib/qrCard'
import { loadCollectorAccount, saveCollectorAccount } from '../lib/storage'
import { QRSheet } from './QRSheet'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

// canvas + share sheet không có trong jsdom — chỉ cần biết QRSheet gọi đúng tham số
vi.mock('../lib/qrCard', () => ({ sharePlayerQR: vi.fn() }))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const shareMock = vi.mocked(sharePlayerQR)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  shareMock.mockResolvedValue('shared')
})

function renderSheet(over: Partial<Parameters<typeof QRSheet>[0]> = {}) {
  const onClose = vi.fn()
  const onTogglePaid = vi.fn()
  render(
    <QRSheet
      open
      onClose={onClose}
      playerName="Tuấn"
      amount={57000}
      memoDate={new Date(2026, 7, 14)}
      paid={false}
      onTogglePaid={onTogglePaid}
      {...over}
    />,
  )
  return { onClose, onTogglePaid }
}

test('first open without account shows the setup form', () => {
  renderSheet()
  expect(screen.getByPlaceholderText('Số tài khoản')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('saving the form stores the account and shows the QR', async () => {
  renderSheet()
  fireEvent.change(screen.getByPlaceholderText('Tìm ngân hàng'), { target: { value: 'mb' } })
  fireEvent.click(screen.getByRole('button', { name: /MB Bank/ }))
  fireEvent.change(screen.getByPlaceholderText('Số tài khoản'), { target: { value: '0011002233' } })
  fireEvent.change(screen.getByPlaceholderText('Tên chủ tài khoản (không bắt buộc)'), {
    target: { value: 'Nguyen Van A' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))
  expect(loadCollectorAccount()).toEqual({
    bankBin: '970422',
    accountNo: '0011002233',
    accountName: 'NGUYEN VAN A',
  })
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })).toBeInTheDocument()
  })
  expect(screen.getByText('Cau long 14/08 Tuan')).toBeInTheDocument()
  expect(screen.getByText(/MB Bank · 0011002233 · NGUYEN VAN A/)).toBeInTheDocument()
})

test('save is disabled until bank chosen and account number valid', () => {
  renderSheet()
  const saveBtn = screen.getByRole('button', { name: 'Lưu tài khoản' })
  expect(saveBtn).toBeDisabled()
  fireEvent.change(screen.getByPlaceholderText('Tìm ngân hàng'), { target: { value: 'vietcom' } })
  fireEvent.click(screen.getByRole('button', { name: /Vietcombank/ }))
  fireEvent.change(screen.getByPlaceholderText('Số tài khoản'), { target: { value: 'a!' } }) // invalid chars/too short
  expect(saveBtn).toBeDisabled()
})

test('with stored account shows QR directly, and Đã trả toggles + closes', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  const { onClose, onTogglePaid } = renderSheet()
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })).toBeInTheDocument()
  })
  expect(screen.getByText('Sửa tài khoản')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '✓ Đã trả' }))
  expect(onTogglePaid).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})

test('paid player gets an un-mark button instead', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  renderSheet({ paid: true })
  expect(await screen.findByRole('button', { name: 'Bỏ đánh dấu đã trả' })).toBeInTheDocument()
})

const ACCOUNT = { bankBin: '970422', accountNo: '0011002233', accountName: 'NGUYEN VAN A' }

/** Lưu sẵn tài khoản rồi mở sheet, trả về nút "Chia sẻ QR" đã hiện. */
async function renderWithShareButton(over: Partial<Parameters<typeof QRSheet>[0]> = {}) {
  saveCollectorAccount(ACCOUNT)
  const handlers = renderSheet(over)
  const button = await screen.findByRole('button', { name: /Chia sẻ QR/ })
  return { ...handlers, button }
}

test('share QR button only shows once an account is stored', async () => {
  await renderWithShareButton()
  expect(screen.getByRole('button', { name: /Chia sẻ QR/ })).toBeInTheDocument()
})

test('no share QR button while the account form is showing', () => {
  renderSheet()
  expect(screen.getByPlaceholderText('Số tài khoản')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Chia sẻ QR/ })).not.toBeInTheDocument()
})

test('clicking share passes this player, amount, date and the stored account', async () => {
  const memoDate = new Date(2026, 7, 14)
  const { button } = await renderWithShareButton({ playerName: 'Đức', amount: 79000, memoDate })
  fireEvent.click(button)
  await waitFor(() => expect(shareMock).toHaveBeenCalledOnce())
  expect(shareMock).toHaveBeenCalledWith({
    playerName: 'Đức',
    amount: 79000,
    memoDate,
    account: ACCOUNT,
  })
})

test('downloaded outcome toasts, shared outcome stays silent', async () => {
  shareMock.mockResolvedValue('downloaded')
  const { button } = await renderWithShareButton({ playerName: 'Đức' })
  fireEvent.click(button)
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã tải ảnh QR của Đức'))

  shareMock.mockResolvedValue('shared')
  vi.mocked(toast.success).mockClear()
  fireEvent.click(button)
  await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(2))
  expect(toast.success).not.toHaveBeenCalled()
})

test('sharing neither closes the sheet nor marks the player paid', async () => {
  const { button, onClose, onTogglePaid } = await renderWithShareButton()
  fireEvent.click(button)
  await waitFor(() => expect(shareMock).toHaveBeenCalledOnce())
  expect(onTogglePaid).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '✓ Đã trả' })).toBeInTheDocument()
})
