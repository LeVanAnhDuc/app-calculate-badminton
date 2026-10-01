// libs
import { useCallback, useEffect, useState } from "react";
// types
import type { AuthStatus, DuckerProfile } from "@/types/Auth";
// requests
import { exchangeCode, fetchProfile } from "@/requests/duckerAuth";
// others
import { consumeCallback, isConfigured, startLogin } from "@/libs/duckerAuth";

/**
 * Hook gắn luồng trên vào React.
 *
 * Nguyên tắc: đăng nhập là **tính năng cộng thêm**, không phải cổng chặn.
 * App phải tính tiền được đầy đủ khi chưa đăng nhập và khi offline — nên mọi
 * lỗi ở đây chỉ hạ trạng thái xuống `signed-out`, không chặn gì cả.
 */
const useDuckerAuth = (): {
  status: AuthStatus;
  profile: DuckerProfile | null;
  signIn: () => void;
  signOut: () => void;
} => {
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
};

export default useDuckerAuth;
