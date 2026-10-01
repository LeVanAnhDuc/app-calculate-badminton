// libs
import { fireEvent, render, screen } from "@testing-library/react";
// types
import type { AuthStatus, DuckerProfile } from "@/types/Auth";
// components
import AccountButton from ".";
// hooks
import { useDuckerAuth } from "@/hooks";

vi.mock("@/hooks/useDuckerAuth", () => ({ default: vi.fn() }));
vi.mock("@/libs/duckerAuth", () => ({ isConfigured: () => true }));

const mockAuth = vi.mocked(useDuckerAuth);
const signIn = vi.fn();
const signOut = vi.fn();

const PROFILE: DuckerProfile = {
  sub: "6705a1f3e8b2c41d9a7c9f2e",
  name: "Lê Văn Anh Đức",
  email: "levananhduc@ducker.vn",
  email_verified: true,
  picture: null
};

function setAuth(status: AuthStatus, profile: DuckerProfile | null = null) {
  mockAuth.mockReturnValue({ status, profile, signIn, signOut });
}

beforeEach(() => {
  signIn.mockClear();
  signOut.mockClear();
});

test("signed out shows a sign-in button", () => {
  setAuth("signed-out");
  render(<AccountButton onOpenAccount={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

  expect(signIn).toHaveBeenCalledOnce();
});

test("clicking the signed-in account opens a menu instead of signing out", () => {
  setAuth("signed-in", PROFILE);
  render(<AccountButton onOpenAccount={vi.fn()} />);

  const trigger = screen.getByRole("button", {
    name: "Tài khoản: Lê Văn Anh Đức"
  });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);

  expect(signOut).not.toHaveBeenCalled();
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const menu = screen.getByRole("menu", { name: "Tài khoản" });
  expect(menu).toHaveTextContent("levananhduc@ducker.vn");
});

test("the menu's sign-out item signs out and closes the menu", () => {
  setAuth("signed-in", PROFILE);
  render(<AccountButton onOpenAccount={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /^Tài khoản:/ }));

  fireEvent.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));

  expect(signOut).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("the menu's account item opens the account page", () => {
  setAuth("signed-in", PROFILE);
  const onOpenAccount = vi.fn();
  render(<AccountButton onOpenAccount={onOpenAccount} />);
  fireEvent.click(screen.getByRole("button", { name: /^Tài khoản:/ }));

  fireEvent.click(
    screen.getByRole("menuitem", { name: "Thông tin tài khoản" })
  );

  expect(onOpenAccount).toHaveBeenCalledOnce();
  expect(signOut).not.toHaveBeenCalled();
});

test("Escape closes the menu and returns focus to the account button", () => {
  setAuth("signed-in", PROFILE);
  render(<AccountButton onOpenAccount={vi.fn()} />);
  const trigger = screen.getByRole("button", { name: /^Tài khoản:/ });
  fireEvent.click(trigger);

  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("pressing outside the menu closes it", () => {
  setAuth("signed-in", PROFILE);
  render(
    <>
      <p>ngoài</p>
      <AccountButton onOpenAccount={vi.fn()} />
    </>
  );
  fireEvent.click(screen.getByRole("button", { name: /^Tài khoản:/ }));

  fireEvent.pointerDown(screen.getByText("ngoài"));

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("clicking the account button again toggles the menu closed", () => {
  setAuth("signed-in", PROFILE);
  render(<AccountButton onOpenAccount={vi.fn()} />);
  const trigger = screen.getByRole("button", { name: /^Tài khoản:/ });

  fireEvent.click(trigger);
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("a profile picture replaces the initials", () => {
  setAuth("signed-in", { ...PROFILE, picture: "https://cdn.example/a.png" });
  render(<AccountButton onOpenAccount={vi.fn()} />);

  const trigger = screen.getByRole("button", { name: /^Tài khoản:/ });
  expect(trigger.querySelector("img")).toHaveAttribute(
    "src",
    "https://cdn.example/a.png"
  );
});
