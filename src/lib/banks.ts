export interface Bank {
  shortName: string
  name: string
  bin: string
}

/**
 * Danh sách ngân hàng tham gia NAPAS IBFT (VietQR chuyển tới tài khoản).
 * Maintain bằng tay để app chạy offline 100% — theo danh bạ BIN của NAPAS.
 * Ví điện tử (MoMo, ZaloPay) không thuộc VietQR-tới-tài-khoản nên không có ở đây.
 */
export const BANKS: Bank[] = [
  { shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', bin: '970436' },
  { shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', bin: '970415' },
  { shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', bin: '970418' },
  { shortName: 'Agribank', name: 'Ngân hàng NN&PT Nông thôn Việt Nam', bin: '970405' },
  { shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', bin: '970407' },
  { shortName: 'MB Bank', name: 'Ngân hàng TMCP Quân đội', bin: '970422' },
  { shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', bin: '970416' },
  { shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', bin: '970432' },
  { shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', bin: '970423' },
  { shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', bin: '970403' },
  { shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM', bin: '970437' },
  { shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', bin: '970441' },
  { shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn – Hà Nội', bin: '970443' },
  { shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', bin: '970431' },
  { shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', bin: '970426' },
  { shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', bin: '970440' },
  { shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', bin: '970448' },
  { shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', bin: '970429' },
  { shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á', bin: '970428' },
  { shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình', bin: '970425' },
  { shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', bin: '970412' },
  { shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á', bin: '970409' },
  { shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á', bin: '970427' },
  { shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', bin: '970419' },
  { shortName: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương', bin: '970400' },
  { shortName: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt', bin: '970438' },
  { shortName: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín', bin: '970433' },
  { shortName: 'KienlongBank', name: 'Ngân hàng TMCP Kiên Long', bin: '970452' },
  { shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', bin: '970449' },
  { shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển', bin: '970430' },
  { shortName: 'DongA Bank', name: 'Ngân hàng TMCP Đông Á', bin: '970406' },
  { shortName: 'GPBank', name: 'Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu', bin: '970408' },
  { shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt', bin: '970454' },
  { shortName: 'CBBank', name: 'Ngân hàng TM TNHH MTV Xây dựng Việt Nam', bin: '970444' },
  { shortName: 'OceanBank', name: 'Ngân hàng TM TNHH MTV Đại Dương', bin: '970414' },
  { shortName: 'Co-opBank', name: 'Ngân hàng Hợp tác xã Việt Nam', bin: '970446' },
  { shortName: 'CAKE by VPBank', name: 'Ngân hàng số CAKE by VPBank', bin: '546034' },
  { shortName: 'Ubank', name: 'Ngân hàng số Ubank by VPBank', bin: '546035' },
  { shortName: 'KBank', name: 'Ngân hàng Đại chúng TNHH Kasikornbank', bin: '668888' },
  { shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam', bin: '970457' },
  { shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', bin: '970424' },
  { shortName: 'Public Bank', name: 'Ngân hàng TNHH MTV Public Việt Nam', bin: '970439' },
  { shortName: 'UOB', name: 'Ngân hàng UOB Việt Nam', bin: '970458' },
  { shortName: 'CIMB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam', bin: '422589' },
  { shortName: 'Indovina Bank', name: 'Ngân hàng TNHH Indovina', bin: '970434' },
  { shortName: 'VRB', name: 'Ngân hàng Liên doanh Việt – Nga', bin: '970421' },
  { shortName: 'Hong Leong Bank', name: 'Ngân hàng TNHH MTV Hong Leong Việt Nam', bin: '970442' },
  { shortName: 'Standard Chartered', name: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam', bin: '970410' },
]

export function findBank(bin: string): Bank | undefined {
  return BANKS.find((b) => b.bin === bin)
}
