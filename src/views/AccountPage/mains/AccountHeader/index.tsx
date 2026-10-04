// components
import { ArrowLeftIcon } from "@/components/Icons";

const AccountHeader = ({ onBack }: { onBack: () => void }) => (
  <header className="rounded-b-3xl bg-emerald-600 px-4 pt-8 pb-6 md:rounded-none">
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={onBack}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"
      >
        <ArrowLeftIcon />
      </button>
      <div>
        <h1 className="text-xl font-bold text-white">Tài khoản</h1>
        <p className="text-sm text-emerald-100">Đăng nhập qua Ducker ID</p>
      </div>
    </div>
  </header>
);

export default AccountHeader;
