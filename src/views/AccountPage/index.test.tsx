// libs
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
// types
import type { DuckerProfile } from "@/types/Auth";
// components
import AccountPage from ".";

// The profile URL is derived from VITE_DUCKER_ISSUER at import time. CI sets no
// issuer, so without this the link has an empty href, React drops it, and the
// <a> stops being a link — the test would pass only on a machine with a .env.
vi.mock("@/constants/duckerAuth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/constants/duckerAuth")>()),
  DUCKER_PROFILE_URL: "https://id.example.test/profile"
}));

const PROFILE: DuckerProfile = {
  sub: "6705a1f3e8b2c41d9a7c9f2e",
  name: "Lê Văn Anh Đức",
  email: "levananhduc@ducker.vn",
  email_verified: true,
  picture: null
};

function renderPage(profile: DuckerProfile = PROFILE) {
  const onBack = vi.fn();
  const onSignOut = vi.fn();
  render(
    <AccountPage profile={profile} onBack={onBack} onSignOut={onSignOut} />
  );
  return { onBack, onSignOut };
}

test("shows the Ducker ID profile", () => {
  renderPage();

  expect(
    screen.getByRole("heading", { name: "Lê Văn Anh Đức" })
  ).toBeInTheDocument();
  expect(screen.getByText("levananhduc@ducker.vn")).toBeInTheDocument();
  expect(screen.getByText("Email đã xác thực")).toBeInTheDocument();
});

test("an unverified email is labelled as such", () => {
  renderPage({ ...PROFILE, email_verified: false });

  expect(screen.getByText("Email chưa xác thực")).toBeInTheDocument();
  expect(screen.queryByText("Email đã xác thực")).not.toBeInTheDocument();
});

test("the account id is shortened on screen but copied in full", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true
  });
  renderPage();

  expect(screen.getByText("6705a1f3…7c9f2e")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Sao chép mã tài khoản" })
  );

  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("6705a1f3e8b2c41d9a7c9f2e")
  );
});

test("links out to manage the account at Ducker ID in a new tab", () => {
  renderPage();

  const link = screen.getByRole("link", {
    name: /Quản lý tài khoản tại Ducker ID/
  });
  expect(link).toHaveAttribute("href", expect.stringMatching(/\/profile$/));
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
});

test("sign out and back are wired to the page callbacks", () => {
  const { onBack, onSignOut } = renderPage();

  fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));

  expect(onSignOut).toHaveBeenCalledOnce();
  expect(onBack).toHaveBeenCalledOnce();
});

test("a profile without a name falls back to the email as the title", () => {
  renderPage({ ...PROFILE, name: undefined });

  expect(
    screen.getByRole("heading", { name: "levananhduc@ducker.vn" })
  ).toBeInTheDocument();
});
