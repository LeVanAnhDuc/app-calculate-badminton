import { initials } from "../lib/initials";
import { isConfigured, useDuckerAuth } from "../lib/duckerAuth";

export function AccountButton() {
  const { status, profile, signIn, signOut } = useDuckerAuth();

  if (!isConfigured()) return null;

  if (status === "loading") {
    return (
      <span className="text-emerald-100 text-sm" aria-live="polite">
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
        className="h-11 px-3 rounded-xl bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2"
      >
        <span className="w-6 h-6 rounded-full bg-emerald-900 text-xs flex items-center justify-center">
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
      className="h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
    >
      Đăng nhập
    </button>
  );
}
