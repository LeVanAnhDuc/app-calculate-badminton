// hooks
import { useDuckerAuth } from "@/hooks";
// others
import { initials } from "@/utils/initials";
import { isConfigured } from "@/libs/duckerAuth";

const AccountButton = () => {
  const { status, profile, signIn, signOut } = useDuckerAuth();

  if (!isConfigured()) return null;

  if (status === "loading") {
    return (
      <span className="text-sm text-emerald-100" aria-live="polite">
        Đang đăng nhập…
      </span>
    );
  }

  if (status === "signed-in" && profile) {
    return (
      <button
        type="button"
        onClick={signOut}
        title={profile.email ?? profile.sub}
        className="flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900 text-xs">
          {initials(profile.name ?? "?")}
        </span>
        <span className="max-w-28 truncate">
          {profile.name ?? "Đã đăng nhập"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white"
    >
      Đăng nhập
    </button>
  );
};

export default AccountButton;
