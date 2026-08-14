import { buildMemo, buildVietQRPayload, crc16, normalizeMemo } from './vietqr'

test('crc16 matches the CRC-16/CCITT-FALSE known vector', () => {
  // Standard check value: crc of ASCII "123456789" is 0x29B1
  expect(crc16('123456789')).toBe('29B1')
})

test('normalizeMemo strips diacritics including đ/Đ', () => {
  expect(normalizeMemo('Cầu lông 14/08 Tuấn')).toBe('Cau long 14/08 Tuan')
  expect(normalizeMemo('đường Đông')).toBe('duong Dong')
})

test('normalizeMemo removes special chars and collapses spaces', () => {
  expect(normalizeMemo('Tiền #cầu   @14')).toBe('Tien cau 14')
})

test('normalizeMemo truncates to 50 chars', () => {
  expect(normalizeMemo('a'.repeat(80))).toHaveLength(50)
})

test('buildMemo formats Cau long DD/MM Name', () => {
  expect(buildMemo(new Date(2026, 7, 14), 'Tuấn')).toBe('Cau long 14/08 Tuan')
  expect(buildMemo(new Date(2026, 0, 5), 'Chị Hoa')).toBe('Cau long 05/01 Chi Hoa')
})

test('dynamic payload matches the expected EMVCo string with valid CRC', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 57000,
    memo: 'Cầu lông 14/08 Tuấn',
  })
  const body = [
    '000201', // 00: version 01
    '010212', // 01: dynamic QR (amount present)
    '3854', // 38: merchant account info, length 54
    '0010A000000727', // 38-00: NAPAS AID
    '0124', // 38-01: beneficiary TLV, length 24
    '0006970422', // bank BIN
    '01100011002233', // account number
    '0208QRIBFTTA', // 38-02: transfer-to-account service
    '5303704', // 53: currency VND
    '540557000', // 54: amount
    '5802VN', // 58: country
    '6223', // 62: additional data, length 23
    '0819Cau long 14/08 Tuan', // 62-08: purpose (memo, normalized)
    '6304', // 63: CRC header
  ].join('')
  expect(payload).toBe(body + crc16(body))
})

test('amount 0 produces a static QR: type 11, no amount field', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 0,
    memo: '',
  })
  const body = [
    '000201',
    '010211', // static QR
    '3854',
    '0010A000000727',
    '0124',
    '0006970422',
    '01100011002233',
    '0208QRIBFTTA',
    '5303704',
    '5802VN',
    '6304',
  ].join('')
  expect(payload).toBe(body + crc16(body))
})

test('empty memo omits field 62 entirely', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 10000,
    memo: '  #@!  ', // normalizes to empty
  })
  // field 58 (VN) is immediately followed by the CRC header — no field 62 between
  expect(payload).toContain('5802VN6304')
})
