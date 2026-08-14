import { render, screen, waitFor } from '@testing-library/react'
import { QRImage } from './QRImage'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

test('renders the QR as an img once the data URL resolves', async () => {
  render(<QRImage payload="000201...6304ABCD" label="Mã VietQR cho Tuấn" />)
  await waitFor(() => {
    const img = screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })
    expect(img).toHaveAttribute('src', 'data:image/png;base64,TEST')
  })
})
