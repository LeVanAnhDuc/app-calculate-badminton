// types
import type { DuckerProfile } from "@/types/Auth";
// components
import AccountDuckerCard from "./mains/AccountDuckerCard";
import AccountHeader from "./mains/AccountHeader";
import AccountProfileCard from "./mains/AccountProfileCard";
import AccountSignOut from "./mains/AccountSignOut";

const AccountPage = ({
  profile,
  onBack,
  onSignOut
}: {
  profile: DuckerProfile;
  onBack: () => void;
  onSignOut: () => void;
}) => (
  <div className="flex min-h-dvh justify-center bg-gray-100">
    {/* pb gộp 2rem + safe-area: hai utility padding-bottom trên cùng element
        sẽ đè nhau theo thứ tự CSS nên gộp thành một class */}
    <div className="min-h-dvh w-full max-w-[430px] bg-gray-50 pb-[calc(2rem+env(safe-area-inset-bottom))] md:max-w-2xl">
      <AccountHeader onBack={onBack} />
      <main className="-mt-2 space-y-4 px-4">
        <AccountProfileCard profile={profile} />
        <AccountDuckerCard sub={profile.sub} />
        <AccountSignOut onSignOut={onSignOut} />
      </main>
    </div>
  </div>
);

export default AccountPage;
