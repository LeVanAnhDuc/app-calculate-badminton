import { consumeCallback } from "./duckerAuth";

const PENDING_KEY = "ducker.pkce";

function goTo(search: string): void {
  window.history.replaceState({}, "", `/${search}`);
}

function setPending(state: string): void {
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ state, verifier: "verifier-abc", returnTo: "/" })
  );
}

beforeEach(() => {
  sessionStorage.clear();
  goTo("");
});

test("không có code hay error thì không coi là callback", () => {
  expect(consumeCallback()).toBeNull();
});

test("code hợp lệ trả về verifier đã cất và dọn sạch URL", () => {
  setPending("state-xyz");
  goTo("?code=auth-code-1&state=state-xyz&iss=http://localhost:3000");

  expect(consumeCallback()).toEqual({
    code: "auth-code-1",
    verifier: "verifier-abc"
  });
  // URL phải sạch — nếu còn ?code= thì một lần F5 sẽ đem code đã tiêu đi đổi lại
  expect(window.location.search).toBe("");
});

test("state không khớp thì từ chối — đây là lớp chống CSRF", () => {
  setPending("state-xyz");
  goTo("?code=auth-code-1&state=state-cua-ke-khac");

  expect(consumeCallback()).toEqual({ error: "state_mismatch" });
});

test("không có phiên chờ nào thì cũng từ chối", () => {
  goTo("?code=auth-code-1&state=state-xyz");

  expect(consumeCallback()).toEqual({ error: "state_mismatch" });
});

test("IdP trả error thì giữ nguyên mã lỗi", () => {
  setPending("state-xyz");
  goTo("?error=login_required&state=state-xyz");

  expect(consumeCallback()).toEqual({ error: "login_required" });
});

test("phiên chờ bị xoá sau khi dùng nên không thể phát lại", () => {
  setPending("state-xyz");
  goTo("?code=auth-code-1&state=state-xyz");

  consumeCallback();

  expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
});

test("giữ lại query param của app, chỉ gỡ tham số của OAuth", () => {
  setPending("state-xyz");
  goTo("?tab=history&code=auth-code-1&state=state-xyz");

  consumeCallback();

  expect(window.location.search).toBe("?tab=history");
});
