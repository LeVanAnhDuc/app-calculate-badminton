// types
import type {
  Gender,
  Mode,
  Rounding,
  CalcResult,
  SessionInput
} from "@/types/Session";

export interface RosterEntry {
  name: string;
  gender: Gender;
}

export interface Settings {
  mode: Mode;
  maleRatio: number;
  femaleRatio: number;
  shuttlePrice: number;
  shuttleName: string;
  rounding: Rounding;
}

export interface SavedSession {
  id: string;
  savedAt: string;
  input: SessionInput;
  result: CalcResult;
}

/** Tài khoản người thu tiền — nhập một lần, dùng sinh VietQR cho mọi buổi. */
export interface CollectorAccount {
  bankBin: string;
  accountNo: string;
  accountName: string; // chỉ để hiển thị cho người trả đối chiếu; '' nếu bỏ trống
}
