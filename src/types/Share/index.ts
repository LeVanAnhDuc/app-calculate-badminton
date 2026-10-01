// types
import type { CollectorAccount } from "@/types/Storage";
import type { CalcResult, Mode, Player } from "@/types/Session";

export interface QRItem {
  name: string;
  amount: number;
  payload: string;
}

export interface QRCardInput {
  playerName: string;
  amount: number;
  memoDate: Date;
  account: CollectorAccount;
}

export type ShareOutcome = "shared" | "cancelled" | "downloaded";

export interface VietQRInput {
  bankBin: string; // BIN NAPAS 6 số, vd "970422" (MB)
  accountNo: string; // số tài khoản người thu
  amount: number; // VND, số nguyên; 0 → QR tĩnh (bỏ field 54, người trả tự nhập)
  memo: string; // nội dung CK (được normalize bên trong)
}

export interface ShareButtonProps {
  result: CalcResult;
  mode: Mode;
  players: Player[];
  date?: Date;
  variant?: "icon" | "wide";
}
