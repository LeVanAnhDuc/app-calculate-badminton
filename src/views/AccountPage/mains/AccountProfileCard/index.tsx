// types
import type { DuckerProfile } from "@/types/Auth";
// components
import AccountAvatar from "@/components/AccountAvatar";
import { CheckIcon } from "@/components/Icons";

const AccountProfileCard = ({ profile }: { profile: DuckerProfile }) => (
  <section className="mt-4 flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-sm">
    <AccountAvatar
      profile={profile}
      className="h-16 w-16 bg-emerald-50 text-xl text-emerald-700"
    />
    <h2 className="mt-3 text-lg font-bold break-words text-gray-900">
      {profile.name ?? profile.email ?? "Tài khoản Ducker ID"}
    </h2>
    {profile.name && profile.email && (
      <p className="mt-0.5 text-sm break-all text-gray-500">{profile.email}</p>
    )}
    {profile.email &&
      (profile.email_verified ? (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <CheckIcon size={14} />
          Email đã xác thực
        </span>
      ) : (
        <span className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
          Email chưa xác thực
        </span>
      ))}
  </section>
);

export default AccountProfileCard;
