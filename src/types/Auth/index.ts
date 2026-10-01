export interface DuckerProfile {
  sub: string;
  name?: string;
  email?: string;
  picture?: string | null;
}

export interface PendingAuth {
  state: string;
  verifier: string;
  returnTo: string;
}

export interface CallbackResult {
  code?: string;
  verifier?: string;
  error?: string;
  /** pathname + search lúc bấm đăng nhập, chỉ có khi callback hợp lệ. */
  returnTo?: string;
}

export type AuthStatus = "idle" | "loading" | "signed-in" | "signed-out";
