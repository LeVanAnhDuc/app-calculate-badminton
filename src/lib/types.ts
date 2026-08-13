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
}

export interface PlayerResult {
  playerId: string
  name: string
  gender: Gender
  halfSession: boolean
  hours: number | null          // null in mode 'ratio'
  courtShare: number            // raw (unrounded)
  shuttleShare: number          // raw (unrounded)
  raw: number
  amount: number                // rounded per input.rounding
}

export interface CalcResult {
  totalCost: number
  totalCollected: number
  surplus: number
  emptyHours: number            // 0 in mode 'ratio'
  players: PlayerResult[]
}
