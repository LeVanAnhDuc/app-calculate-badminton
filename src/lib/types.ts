export type Gender = 'male' | 'female'
export type Mode = 'ratio' | 'hourly'
export type Rounding = 'up1000' | 'exact'

export interface Player {
  id: string
  name: string
  gender: Gender
  halfSession: boolean          // mode 'ratio' only
  startTime: string | null      // mode 'hourly'; null = cả buổi (follows court times)
  endTime: string | null
  paid: boolean                 // đã trả tiền hay chưa, mặc định false
}

export interface ExtraCost {
  id: string
  label: string                 // "Thuê vợt", "Nước" — có thể rỗng lúc vừa thêm
  amount: number                // VND, số nguyên ≥ 0 — TỔNG của khoản, không phải phần mỗi người
  playerIds: string[]           // tập người cùng chịu; chia ĐỀU theo đầu người
}

/** Một khoản phát sinh đã chia, tính sẵn cho MỘT người — chỉ dùng để hiển thị. */
export interface ExtraShare {
  label: string                 // đã chuẩn hóa: nhãn rỗng → "Khoản khác"
  share: number                 // phần của riêng người này = amount / số người chịu (raw)
  sharedCount: number           // số người cùng chịu; > 1 → UI in "(chung, N người)"
}

export interface SessionInput {
  mode: Mode
  shuttleCount: number
  shuttlePrice: number
  courtFee: number
  courtStart: string            // "HH:mm", used in mode 'hourly'
  courtEnd: string
  maleRatio: number
  femaleRatio: number
  rounding: Rounding
  players: Player[]
  extras: ExtraCost[]           // mặc định [] — mảng phẳng, không nhóm sẵn theo người
}

export interface PlayerResult {
  playerId: string
  name: string
  gender: Gender
  halfSession: boolean
  hours: number | null          // null in mode 'ratio'
  courtShare: number            // raw (unrounded)
  shuttleShare: number          // raw (unrounded)
  extras: ExtraShare[]          // từng khoản của riêng người này, đã chia sẵn
  extrasTotal: number           // = tổng extras[].share; GIỮ LẠI cho buổi lưu bởi v1.4.0
  raw: number                   // courtShare + shuttleShare + extrasTotal
  amount: number                // rounded per input.rounding
}

export interface CalcResult {
  totalCost: number
  totalCollected: number
  surplus: number
  emptyHours: number            // 0 in mode 'ratio'
  players: PlayerResult[]
}
