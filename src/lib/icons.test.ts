import { readFileSync } from 'node:fs'

/** Bỏ comment và khoảng trắng thừa để so sánh phần hình, bỏ qua width/height. */
function artwork(path: string): string {
  return readFileSync(path, 'utf-8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+width="\d+"\s+height="\d+"/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

test('3 icon bản "any" dùng chung một hình, chỉ khác kích thước', () => {
  const a = artwork('assets/icons/icon-512.svg')
  expect(artwork('assets/icons/icon-192.svg')).toBe(a)
  expect(artwork('assets/icons/apple-touch-icon.svg')).toBe(a)
})

test('mỗi SVG nguồn khai đúng kích thước đích', () => {
  const size = (p: string) => {
    const m = readFileSync(p, 'utf-8').match(/width="(\d+)" height="(\d+)"/)
    return m ? [Number(m[1]), Number(m[2])] : null
  }
  expect(size('assets/icons/icon-192.svg')).toEqual([192, 192])
  expect(size('assets/icons/icon-512.svg')).toEqual([512, 512])
  expect(size('assets/icons/icon-maskable-512.svg')).toEqual([512, 512])
  expect(size('assets/icons/apple-touch-icon.svg')).toEqual([180, 180])
})

/** Đọc IHDR của PNG: rộng, cao, color type (2 = RGB không alpha, 6 = RGBA). */
function pngHeader(path: string): { width: number; height: number; colorType: number } {
  const b = readFileSync(path)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] }
}

test('PNG sinh ra đúng kích thước và không có kênh alpha', () => {
  // iOS tô nền đen vào vùng trong suốt, nên mọi icon phải đặc hoàn toàn
  expect(pngHeader('public/icon-192.png')).toEqual({ width: 192, height: 192, colorType: 2 })
  expect(pngHeader('public/icon-512.png')).toEqual({ width: 512, height: 512, colorType: 2 })
  expect(pngHeader('public/icon-maskable-512.png')).toEqual({
    width: 512, height: 512, colorType: 2,
  })
  expect(pngHeader('public/apple-touch-icon.png')).toEqual({
    width: 180, height: 180, colorType: 2,
  })
})
