import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CopyTextButton, ShareImageButton } from './ShareButtons'
import { copyResultText, shareResultImage } from '../lib/shareResult'
import type { CalcResult, Player } from '../lib/types'

vi.mock('../lib/shareResult', () => ({
  shareResultImage: vi.fn(),
  copyResultText: vi.fn(),
}))

const players: Player[] = [
  { id: '1', name: 'Đức', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
]
const result: CalcResult = {
  totalCost: 70000, totalCollected: 70000, surplus: 0, emptyHours: 0,
  players: [{ playerId: '1', name: 'Đức', gender: 'male', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 70000, amount: 70000 }],
}

afterEach(() => vi.clearAllMocks())

test('share button calls shareResultImage; toasts only on download fallback', async () => {
  const shareMock = vi.mocked(shareResultImage)
  shareMock.mockResolvedValue('shared')
  const toastSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
  render(<ShareImageButton result={result} mode="ratio" players={players} />)
  await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ ảnh kết quả' }))
  await waitFor(() => expect(shareMock).toHaveBeenCalled())
  expect(toastSpy).not.toHaveBeenCalled()

  shareMock.mockResolvedValue('downloaded')
  await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ ảnh kết quả' }))
  await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Đã tải ảnh kết quả'))
})

test('copy button toasts success or error from copyResultText', async () => {
  const copyMock = vi.mocked(copyResultText)
  copyMock.mockResolvedValue(true)
  const okSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
  const errSpy = vi.spyOn(toast, 'error').mockImplementation(() => '')
  render(<CopyTextButton result={result} mode="ratio" players={players} />)
  await userEvent.click(screen.getByRole('button', { name: 'Copy kết quả' }))
  await waitFor(() => expect(okSpy).toHaveBeenCalledWith('Đã copy kết quả ✓'))

  copyMock.mockResolvedValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Copy kết quả' }))
  await waitFor(() => expect(errSpy).toHaveBeenCalledWith('Không copy được kết quả'))
})

test('wide variant renders labelled buttons and forwards the date', async () => {
  const shareMock = vi.mocked(shareResultImage)
  shareMock.mockResolvedValue('shared')
  const date = new Date(2026, 7, 1)
  render(<ShareImageButton result={result} mode="ratio" players={players} date={date} variant="wide" />)
  await userEvent.click(screen.getByRole('button', { name: /Chia sẻ ảnh/ }))
  await waitFor(() =>
    expect(shareMock).toHaveBeenCalledWith(result, 'ratio', players, date),
  )
})
