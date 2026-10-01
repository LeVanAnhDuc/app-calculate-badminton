import { useCallback, useEffect, useState } from "react";
import { challengeOf, randomUrlSafeToken } from "./pkce";

/**
 * Đăng nhập qua Ducker ID (OIDC Authorization Code + PKCE).
 *
 * Badminton là **public client**: không backend, deploy tĩnh trên GitHub Pages.
 * Vì vậy — theo đúng thứ tự nhân quả:
 *
 * - không có `client_secret` (trình duyệt không giữ được bí mật) → PKCE
 * - không có cookie dùng chung với IdP (`github.io` nằm trong Public Suffix
 *   List, và cookie cross-site đang bị chặn) → không có refresh token
 * - không có refresh token → access token hết hạn thì thử lại `prompt=none`
 *
 * `client_id` và `issuer` KHÔNG phải bí mật — chúng công khai theo thiết kế
 * của OAuth, nên để trong bundle là đúng.
 */

const ISSUER = import.meta.env.VITE_DUCKER_ISSUER ?? "http://localhost:3000";
const CLIENT_ID = import.meta.env.VITE_DUCKER_CLIENT_ID ?? "";
const SCOPE = "openid profile email";

const STATE_KEY = "ducker.pkce";

export interface DuckerProfile {
  sub: string;
  name?: string;
  email?: string;
  picture?: string | null;
}

interface PendingAuth {
  state: string;
  verifier: string;
  returnTo: string;
}

/**
 * redirect_uri là CHÍNH gốc app, không phải `/auth/callback`.
 *
 * GitHub Pages là hosting tĩnh, không có SPA fallback — một request thẳng tới
 * `/auth/callback` sẽ trả 404 vì không có file nào ở đó. Gốc app thì luôn tồn
 * tại. Tiện thể nó né luôn việc service worker phải xử lý một đường dẫn lạ.
 *
 * Giá trị này phải khớp TUYỆT ĐỐI với redirectUris đã đăng ký ở Ducker ID.
 */
export function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

export function isConfigured(): boolean {
  return CLIENT_ID !== "";
}

function readPending(): PendingAuth | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as PendingAuth) : null;
  } catch {
    return null;
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    // sessionStorage bị chặn (private mode) — coi như không có phiên chờ
  }
}

/** Dựng URL authorize và chuyển hướng cả trang sang Ducker ID. */
export async function startLogin(options?: {
  silent?: boolean;
}): Promise<void> {
  const verifier = randomUrlSafeToken();
  const state = randomUrlSafeToken();

  try {
    sessionStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        state,
        verifier,
        returnTo: window.location.pathname + window.location.search
      } satisfies PendingAuth)
    );
  } catch {
    return; // không cất được verifier thì đừng bắt đầu, sẽ kẹt ở callback
  }

  const url = new URL("/oauth/authorize", ISSUER);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await challengeOf(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  // prompt=none: chỉ dò xem IdP còn phiên không, không được hiện màn hình nào.
  if (options?.silent) url.searchParams.set("prompt", "none");

  window.location.assign(url.toString());
}

export interface CallbackResult {
  code?: string;
  verifier?: string;
  error?: string;
}

/**
 * Đọc `?code=` hoặc `?error=` ở gốc app rồi **dọn URL ngay**.
 *
 * Dọn bằng replaceState là bắt buộc: authorization code chỉ dùng được một lần,
 * để nguyên trên URL thì một lần F5 sẽ đem code đã tiêu đi đổi lần nữa và nhận
 * `invalid_grant`.
 */
export function consumeCallback(): CallbackResult | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");
  const state = params.get("state");

  if (!code && !error) return null;

  const pending = readPending();
  clearPending();

  params.delete("code");
  params.delete("state");
  params.delete("error");
  params.delete("error_description");
  params.delete("iss");

  const query = params.toString();
  window.history.replaceState(
    {},
    "",
    window.location.pathname + (query ? `?${query}` : "")
  );

  if (error) return { error };

  // state không khớp nghĩa là callback này không do tab hiện tại khởi tạo —
  // vứt, đây chính là lớp chống CSRF của OAuth.
  if (!pending || pending.state !== state) return { error: "state_mismatch" };

  return { code: code ?? undefined, verifier: pending.verifier };
}

/** Đổi authorization code lấy token. KHÔNG kèm client_secret — public client. */
export async function exchangeCode(
  code: string,
  verifier: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const response = await fetch(new URL("/oauth/token", ISSUER), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID
    })
  });

  if (!response.ok) throw new Error(`token_exchange_failed_${response.status}`);

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };
}

export async function fetchProfile(
  accessToken: string
): Promise<DuckerProfile> {
  const response = await fetch(new URL("/oauth/userinfo", ISSUER), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error(`userinfo_failed_${response.status}`);

  return (await response.json()) as DuckerProfile;
}

export type AuthStatus = "idle" | "loading" | "signed-in" | "signed-out";

/**
 * Hook gắn luồng trên vào React.
 *
 * Nguyên tắc: đăng nhập là **tính năng cộng thêm**, không phải cổng chặn.
 * App phải tính tiền được đầy đủ khi chưa đăng nhập và khi offline — nên mọi
 * lỗi ở đây chỉ hạ trạng thái xuống `signed-out`, không chặn gì cả.
 */
export function useDuckerAuth(): {
  status: AuthStatus;
  profile: DuckerProfile | null;
  signIn: () => void;
  signOut: () => void;
} {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [profile, setProfile] = useState<DuckerProfile | null>(null);

  useEffect(() => {
    if (!isConfigured()) {
      setStatus("signed-out");
      return;
    }

    const callback = consumeCallback();

    if (!callback) {
      setStatus("signed-out");
      return;
    }

    if (callback.error || !callback.code || !callback.verifier) {
      setStatus("signed-out");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    exchangeCode(callback.code, callback.verifier)
      .then((tokens) => fetchProfile(tokens.accessToken))
      .then((me) => {
        if (cancelled) return;
        setProfile(me);
        setStatus("signed-in");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("signed-out");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    void startLogin();
  }, []);

  const signOut = useCallback(() => {
    // Không có refresh token nào để thu hồi và không có session cookie của
    // riêng badminton — quên profile trong bộ nhớ là đủ để đăng xuất khỏi app
    // này. Phiên ở Ducker ID vẫn còn, đó là đúng ý nghĩa của SSO.
    setProfile(null);
    setStatus("signed-out");
  }, []);

  return { status, profile, signIn, signOut };
}
