import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

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

/** Giải mã PNG (không nén, RGB hoặc RGBA) thành pixel thô — bỏ qua ancillary chunk. */
function decodePNG(path: string): { w: number; h: number; bpp: number; px: Buffer } {
  const buf = readFileSync(path)
  let pos = 8
  let w = 0
  let h = 0
  let ct = 0
  const idat: Buffer[] = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      ct = data[9]
    }
    if (type === 'IDAT') idat.push(Buffer.from(data))
    pos += 12 + len
  }
  const bpp = ct === 2 ? 3 : ct === 6 ? 4 : null
  if (!bpp) throw new Error('color type không hỗ trợ: ' + ct)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const out = Buffer.alloc(h * stride)
  let rp = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++]
    for (let x = 0; x < stride; x++) {
      const cur = raw[rp + x]
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let v: number
      if (filter === 0) v = cur
      else if (filter === 1) v = cur + a
      else if (filter === 2) v = cur + b
      else if (filter === 3) v = cur + ((a + b) >> 1)
      else {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      }
      out[y * stride + x] = v & 0xff
    }
    rp += stride
  }
  return { w, h, bpp, px: out }
}

test('mọi nét vẽ của icon maskable nằm trong vòng an toàn 80%', () => {
  // Android cắt icon maskable theo hình do máy quy định (tròn, squircle, giọt
  // nước…) — bất cứ nét nào ra ngoài vòng nội tiếp bán kính 40% (đường kính
  // 80%) tính từ tâm đều có nguy cơ bị cắt mất.
  const { w, h, bpp, px } = decodePNG('public/icon-maskable-512.png')
  const cx = w / 2
  const cy = h / 2
  const safeR = w * 0.4
  let pixelsOutsideSafeZone = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w * bpp + x * bpp
      // Nền emerald #059669 = (5,150,105). Pixel lệch xa màu nền => là nét vẽ.
      const distanceFromBg = Math.abs(px[i] - 5) + Math.abs(px[i + 1] - 150) + Math.abs(px[i + 2] - 105)
      if (distanceFromBg < 40) continue
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (r > safeR) pixelsOutsideSafeZone++
    }
  }
  expect(pixelsOutsideSafeZone).toBe(0)
})
