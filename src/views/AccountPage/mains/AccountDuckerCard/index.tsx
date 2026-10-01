// libs
import { toast } from "sonner";
// components
import { CopyIcon, ExternalLinkIcon } from "@/components/Icons";
// others
import { DUCKER_PROFILE_URL } from "@/constants/duckerAuth";
import { shortenId } from "@/utils/format";

const AccountDuckerCard = ({ sub }: { sub: string }) => {
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(sub);
      toast.success("Đã sao chép mã tài khoản");
    } catch {
      toast.error("Không sao chép được — trình duyệt chặn bộ nhớ tạm");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-xs font-bold text-gray-400 uppercase">
        Tài khoản Ducker ID
      </h2>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">Mã tài khoản</p>
          <p className="truncate font-mono text-sm text-gray-900" title={sub}>
            {shortenId(sub)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Sao chép mã tài khoản"
          title="Sao chép"
          onClick={() => void copyId()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100"
        >
          <CopyIcon size={20} />
        </button>
      </div>
      <a
        href={DUCKER_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
      >
        Quản lý tài khoản tại Ducker ID
        <span className="text-gray-400">
          <ExternalLinkIcon />
        </span>
      </a>
      <p className="mt-2 text-center text-xs text-gray-400">
        Đổi tên, ảnh đại diện, mật khẩu ở Ducker ID
      </p>
    </section>
  );
};

export default AccountDuckerCard;
