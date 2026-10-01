import { challengeOf, randomUrlSafeToken } from './pkce'

test('challenge khớp test vector của RFC 7636 phụ lục B', async () => {
  await expect(
    challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
  ).resolves.toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
})

test('challenge là base64url — không có +, / hay dấu = đệm', async () => {
  const challenge = await challengeOf(randomUrlSafeToken())
  expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('verifier cũng là base64url và đủ dài theo yêu cầu của spec', () => {
  const verifier = randomUrlSafeToken()
  expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  // RFC 7636 §4.1: tối thiểu 43 ký tự
  expect(verifier.length).toBeGreaterThanOrEqual(43)
})

test('mỗi lần gọi sinh một verifier khác nhau', () => {
  const tokens = new Set(Array.from({ length: 20 }, () => randomUrlSafeToken()))
  expect(tokens.size).toBe(20)
})

test('cùng một verifier luôn cho cùng một challenge', async () => {
  const verifier = randomUrlSafeToken()
  expect(await challengeOf(verifier)).toBe(await challengeOf(verifier))
})
