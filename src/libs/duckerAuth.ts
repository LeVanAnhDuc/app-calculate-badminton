// types
import type { CallbackResult, PendingAuth } from "@/types/Auth";
// others
import {
  DUCKER_CLIENT_ID,
  DUCKER_ISSUER,
  DUCKER_SCOPE,
  DUCKER_STATE_KEY
} from "@/constants/duckerAuth";
import { challengeOf, randomUrlSafeToken } from "@/libs/pkce";

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
  return DUCKER_CLIENT_ID !== "";
}

function readPending(): PendingAuth | null {
  try {
    const raw = sessionStorage.getItem(DUCKER_STATE_KEY);
    return raw ? (JSON.parse(raw) as PendingAuth) : null;
  } catch {
    return null;
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(DUCKER_STATE_KEY);
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
      DUCKER_STATE_KEY,
      JSON.stringify({
        state,
        verifier,
        returnTo: window.location.pathname + window.location.search
      } satisfies PendingAuth)
    );
  } catch {
    return; // không cất được verifier thì đừng bắt đầu, sẽ kẹt ở callback
  }

  const url = new URL("/oauth/authorize", DUCKER_ISSUER);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", DUCKER_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", DUCKER_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await challengeOf(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  // prompt=none: chỉ dò xem IdP còn phiên không, không được hiện màn hình nào.
  if (options?.silent) url.searchParams.set("prompt", "none");

  window.location.assign(url.toString());
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
