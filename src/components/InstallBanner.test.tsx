import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallBanner } from './InstallBanner'
import { useInstallPrompt } from '../lib/installPrompt'

vi.mock('../lib/installPrompt', () => ({ useInstallPrompt: vi.fn() }))

const mockHook = vi.mocked(useInstallPrompt)
const install = vi.fn()
const dismiss = vi.fn()

beforeEach(() => {
  install.mockClear()
  dismiss.mockClear()
})

test('không render gì khi mode là hidden', () => {
  mockHook.mockReturnValue({ mode: 'hidden', install, dismiss })
  const { container } = render(<InstallBanner />)
  expect(container).toBeEmptyDOMElement()
})

test('Android hiện nút Cài đặt', async () => {
  mockHook.mockReturnValue({ mode: 'android', install, dismiss })
  render(<InstallBanner />)
  await userEvent.click(screen.getByRole('button', { name: 'Cài đặt' }))
  expect(install).toHaveBeenCalledTimes(1)
})

test('iOS hiện hướng dẫn Share và KHÔNG có nút Cài đặt', () => {
  mockHook.mockReturnValue({ mode: 'ios', install, dismiss })
  render(<InstallBanner />)
  // iOS không có API cài đặt nên chỉ hướng dẫn được
  expect(screen.getByText(/Thêm vào MH chính/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cài đặt' })).not.toBeInTheDocument()
})

test('bấm nút tắt gọi dismiss()', async () => {
  mockHook.mockReturnValue({ mode: 'android', install, dismiss })
  render(<InstallBanner />)
  await userEvent.click(screen.getByRole('button', { name: 'Tắt lời mời cài app' }))
  expect(dismiss).toHaveBeenCalledTimes(1)
})
