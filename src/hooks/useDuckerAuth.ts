// libs
import { useCallback, useEffect, useState } from "react";
// types
import type { AuthStatus, DuckerProfile } from "@/types/Auth";
// requests
import { exchangeCode, fetchProfile } from "@/requests/duckerAuth";
// others
import { capturedCallback, isConfigured, startLogin } from "@/libs/duckerAuth";

/**
 * Lần đổi code → profile của cả lần mở app, dùng chung cho mọi lần mount.
 *
 * - StrictMode chạy effect hai lần: lần hai phải chờ cùng promise chứ không
 *   đổi code thêm lần nữa (code chỉ dùng được một lần).
 * - Chuyển sang /history rồi quay lại thì AccountButton mount lại — vẫn nhận
 *   lại đúng profile thay vì rơi về "Đăng nhập".
 *
 * `undefined` = chưa bắt đầu, `null` = lần mở này không có gì để đổi.
 */
let login: Promise<DuckerProfile> | null | undefined;
// profile đã đổi xong — mount sau đọc thẳng, không nháy trạng thái "loading"
let resolved: DuckerProfile | null = null;

function pendingLogin(): Promise<DuckerProfile> | null {
  if (login === undefined) {
    const callback = capturedCallback();
    login =
      callback && !callback.error && callback.code && callback.verifier
        ? exchangeCode(callback.code, callback.verifier)
            .then((tokens) => fetchProfile(tokens.accessToken))
            .then((me) => {
              resolved = me;
              return me;
            })
        : null;
  }
  return login;
}

function initialStatus(): AuthStatus {
  if (!isConfigured()) return "signed-out";
  if (resolved) return "signed-in";
  return pendingLogin() ? "loading" : "signed-out";
}

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
  // decided on the first render, so a signed-out header never flashes a
  // spinner and a remount after sign-in shows the name straight away
  const [status, setStatus] = useState<AuthStatus>(initialStatus);
  const [profile, setProfile] = useState<DuckerProfile | null>(() => resolved);

  useEffect(() => {
    if (status !== "loading") return;
    const pending = pendingLogin();
    if (!pending) return;

    let cancelled = false;

    pending
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
    // runs for the first render only: later status changes come from here
  }, []);

  const signIn = useCallback(() => {
    void startLogin();
  }, []);

  const signOut = useCallback(() => {
    // Không có refresh token nào để thu hồi và không có session cookie của
    // riêng badminton — quên profile trong bộ nhớ là đủ để đăng xuất khỏi app
    // này. Phiên ở Ducker ID vẫn còn, đó là đúng ý nghĩa của SSO.
    login = null;
    resolved = null;
    setProfile(null);
    setStatus("signed-out");
  }, []);

  return { status, profile, signIn, signOut };
};

export default useDuckerAuth;
