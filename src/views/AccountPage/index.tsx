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
  <div className="min-h-dvh bg-gray-100">
    {/* pb gộp 2rem + safe-area: hai utility padding-bottom trên cùng element
        sẽ đè nhau theo thứ tự CSS nên gộp thành một class */}
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-gray-50 pb-[calc(2rem+env(safe-area-inset-bottom))] md:max-w-none md:bg-gray-100 md:pb-0">
      <AccountHeader onBack={onBack} />
      <main className="-mt-2 space-y-4 px-4 md:mx-auto md:mt-0 md:grid md:max-w-5xl md:grid-cols-5 md:items-start md:gap-6 md:space-y-0 md:px-6 md:py-6">
        <AccountProfileCard profile={profile} />
        <div className="space-y-4 md:col-span-3">
          <AccountDuckerCard sub={profile.sub} />
          <AccountSignOut onSignOut={onSignOut} />
        </div>
      </main>
    </div>
  </div>
);

export default AccountPage;
