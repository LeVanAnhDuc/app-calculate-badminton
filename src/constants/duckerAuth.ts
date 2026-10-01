// client_id và issuer KHÔNG phải bí mật — công khai theo thiết kế của OAuth.
export const DUCKER_ISSUER =
  import.meta.env.VITE_DUCKER_ISSUER ?? "http://localhost:3000";
export const DUCKER_CLIENT_ID = import.meta.env.VITE_DUCKER_CLIENT_ID ?? "";
export const DUCKER_SCOPE = "openid profile email";

export const DUCKER_STATE_KEY = "ducker.pkce";

// Trang hồ sơ của Ducker ID — đổi tên, ảnh, mật khẩu đều ở đó, không ở đây.
export const DUCKER_PROFILE_URL = new URL("/profile", DUCKER_ISSUER).toString();
