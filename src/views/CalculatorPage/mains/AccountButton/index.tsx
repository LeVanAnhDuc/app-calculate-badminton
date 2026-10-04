// libs
import { useEffect, useRef, useState } from "react";
// components
import AccountAvatar from "@/components/AccountAvatar";
import { ChevronIcon, UserIcon } from "@/components/Icons";
import AccountMenu from "../../components/AccountMenu";
// hooks
import { useDuckerAuth } from "@/hooks";
// others
import { isConfigured } from "@/libs/duckerAuth";

/**
 * Nút tài khoản ở góc phải header — có cả trên mobile (avatar tròn 44px) lẫn
 * desktop (chip avatar + tên). Đã đăng nhập thì bấm vào mở menu, không còn
 * đăng xuất ngay như trước: một cú chạm nhầm không được làm mất phiên.
 */
const AccountButton = ({ onOpenAccount }: { onOpenAccount: () => void }) => {
  const { status, profile, signIn, signOut } = useDuckerAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // không có lớp phủ: chạm ra ngoài hoặc Esc thì đóng, Esc trả focus về nút
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isConfigured()) return null;

  if (status === "idle" || status === "loading") {
    return (
      <span
        role="status"
        aria-label="Đang đăng nhập"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-white motion-reduce:animate-none" />
      </span>
    );
  }

  if (status === "signed-out" || !profile) {
    return (
      // a 44px circle on mobile, same footprint as the signed-in avatar — the
      // text label would push the app title onto two lines at 390px
      <button
        type="button"
        aria-label="Đăng nhập"
        onClick={signIn}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white md:w-auto md:rounded-xl md:px-4"
      >
        <span className="md:hidden">
          <UserIcon />
        </span>
        <span className="hidden md:inline">Đăng nhập</span>
      </button>
    );
  }

  const displayName = profile.name ?? profile.email ?? "Tài khoản";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Tài khoản: ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 items-center gap-2 rounded-full text-sm font-semibold text-white md:rounded-xl md:bg-emerald-700 md:pr-3 md:pl-1.5 ${
          open ? "ring-2 ring-white" : ""
        }`}
      >
        <AccountAvatar
          profile={profile}
          className="h-11 w-11 bg-emerald-700 text-sm md:h-8 md:w-8 md:bg-emerald-600 md:text-xs"
        />
        <span className="hidden max-w-32 truncate md:inline">
          {displayName}
        </span>
        <span
          className={`hidden text-emerald-100 transition-transform md:block ${
            open ? "-rotate-90" : "rotate-90"
          }`}
        >
          <ChevronIcon />
        </span>
      </button>
      {open && (
        <AccountMenu
          profile={profile}
          onOpenAccount={() => {
            setOpen(false);
            onOpenAccount();
          }}
          onSignOut={() => {
            setOpen(false);
            signOut();
          }}
        />
      )}
    </div>
  );
};

export default AccountButton;
