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

export interface ShuttleLine {
  id: string
  name: string                  // "Hải Yến 3 sao" — có thể rỗng lúc vừa thêm
  count: number                 // số quả, nguyên ≥ 0
  price: number                 // VND / quả, ≥ 0
}

export interface ExtraCost {
  id: string
  label: string                 // "Thuê vợt", "Nước" — có thể rỗng lúc vừa thêm
  amount: number                // VND, số nguyên ≥ 0
  playerId: string              // Player.id của người chịu TOÀN BỘ khoản này
}

export interface SessionInput {
  mode: Mode
  shuttles: ShuttleLine[]       // nhiều loại cầu trong cùng buổi; [] = không mua cầu
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
  extrasTotal: number           // tổng khoản phát sinh của riêng người này (raw)
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
