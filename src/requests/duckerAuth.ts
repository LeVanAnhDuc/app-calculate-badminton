// types
import type { DuckerProfile } from "@/types/Auth";
// others
import { DUCKER_CLIENT_ID, DUCKER_ISSUER } from "@/constants/duckerAuth";
import { redirectUri } from "@/libs/duckerAuth";

/** Đổi authorization code lấy token. KHÔNG kèm client_secret — public client. */
export async function exchangeCode(
  code: string,
  verifier: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const response = await fetch(new URL("/oauth/token", DUCKER_ISSUER), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: DUCKER_CLIENT_ID
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
  const response = await fetch(new URL("/oauth/userinfo", DUCKER_ISSUER), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error(`userinfo_failed_${response.status}`);

  return (await response.json()) as DuckerProfile;
}
