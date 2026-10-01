// types
import type { DuckerProfile } from "@/types/Auth";
// components
import AccountAvatar from "@/components/AccountAvatar";
import { ChevronIcon, SignOutIcon, UserIcon } from "@/components/Icons";

const AccountMenu = ({
  profile,
  onOpenAccount,
  onSignOut
}: {
  profile: DuckerProfile;
  onOpenAccount: () => void;
  onSignOut: () => void;
}) => (
  <div
    role="menu"
    aria-label="Tài khoản"
    className="absolute top-[calc(100%+0.5rem)] right-0 z-30 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-lg"
  >
    <div className="flex items-center gap-3 p-4">
      <AccountAvatar
        profile={profile}
        className="h-10 w-10 bg-emerald-50 text-sm text-emerald-700"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">
          {profile.name ?? profile.email ?? "Tài khoản Ducker ID"}
        </p>
        {profile.email && (
          <p className="truncate text-sm text-gray-500">{profile.email}</p>
        )}
      </div>
    </div>
    <div className="border-t border-gray-100 p-1.5">
      <button
        type="button"
        role="menuitem"
        onClick={onOpenAccount}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
      >
        <span className="text-gray-500">
          <UserIcon />
        </span>
        <span className="flex-1">Thông tin tài khoản</span>
        <span className="text-gray-300">
          <ChevronIcon />
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onSignOut}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-500 hover:bg-red-50"
      >
        <SignOutIcon />
        <span>Đăng xuất</span>
      </button>
    </div>
  </div>
);

export default AccountMenu;
