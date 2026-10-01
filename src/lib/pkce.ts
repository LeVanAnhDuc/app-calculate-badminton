/**
 * PKCE (RFC 7636) — thứ thay thế client_secret cho app chạy hoàn toàn trên
 * trình duyệt.
 *
 * Badminton là public client: không có backend, nên không có chỗ nào giữ được
 * bí mật dài hạn. `code_verifier` an toàn ở đây vì nó sinh mới mỗi lần đăng
 * nhập, sống vài giây, dùng một lần rồi vứt — lộ một verifier chỉ hỏng đúng
 * phiên đó, khác hẳn lộ một secret cố định.
 */

const VERIFIER_BYTES = 32;

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Chuỗi ngẫu nhiên base64url — dùng cho cả code_verifier lẫn state/nonce. */
export function randomUrlSafeToken(): string {
  return toBase64Url(
    crypto.getRandomValues(new Uint8Array(VERIFIER_BYTES)).buffer
  );
}

/** challenge = BASE64URL(SHA256(ASCII(verifier))) — phương thức S256. */
export async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return toBase64Url(digest);
}
