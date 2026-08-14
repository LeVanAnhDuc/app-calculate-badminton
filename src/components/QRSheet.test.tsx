import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadCollectorAccount, saveCollectorAccount } from '../lib/storage'
import { QRSheet } from './QRSheet'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

beforeEach(() => localStorage.clear())

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
  const user = userEvent.setup()
  renderSheet()
  await user.type(screen.getByPlaceholderText('Tìm ngân hàng'), 'mb')
  await user.click(screen.getByRole('button', { name: /MB Bank/ }))
  await user.type(screen.getByPlaceholderText('Số tài khoản'), '0011002233')
  await user.type(screen.getByPlaceholderText('Tên chủ tài khoản (không bắt buộc)'), 'Nguyen Van A')
  await user.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))
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

test('save is disabled until bank chosen and account number valid', async () => {
  const user = userEvent.setup()
  renderSheet()
  const saveBtn = screen.getByRole('button', { name: 'Lưu tài khoản' })
  expect(saveBtn).toBeDisabled()
  await user.type(screen.getByPlaceholderText('Tìm ngân hàng'), 'vietcom')
  await user.click(screen.getByRole('button', { name: /Vietcombank/ }))
  await user.type(screen.getByPlaceholderText('Số tài khoản'), 'a!') // invalid chars/too short
  expect(saveBtn).toBeDisabled()
})

test('with stored account shows QR directly, and Đã trả toggles + closes', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  const user = userEvent.setup()
  const { onClose, onTogglePaid } = renderSheet()
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })).toBeInTheDocument()
  })
  expect(screen.getByText('Sửa tài khoản')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '✓ Đã trả' }))
  expect(onTogglePaid).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})

test('paid player gets an un-mark button instead', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  renderSheet({ paid: true })
  expect(await screen.findByRole('button', { name: 'Bỏ đánh dấu đã trả' })).toBeInTheDocument()
})
