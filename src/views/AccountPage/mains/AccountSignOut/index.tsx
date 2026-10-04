// components
import { SignOutIcon } from "@/components/Icons";

const AccountSignOut = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="pt-2 md:pt-0">
    <button
      type="button"
      onClick={onSignOut}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-500 hover:bg-red-50"
    >
      <SignOutIcon />
      Đăng xuất
    </button>
    <p className="mt-2 px-2 text-center text-xs text-gray-400">
      Chỉ đăng xuất khỏi app này — phiên ở Ducker ID vẫn còn.
      <br />
      Dữ liệu tính tiền trên máy không bị xoá.
    </p>
  </div>
);

export default AccountSignOut;
