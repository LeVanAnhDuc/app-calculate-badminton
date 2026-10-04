// components
import { ArrowLeftIcon } from "@/components/Icons";

const HistoryHeader = ({
  count,
  thisMonth,
  onBack
}: {
  count: number;
  thisMonth: number;
  onBack: () => void;
}) => (
  <header className="rounded-b-3xl bg-emerald-600 px-4 pt-8 pb-6 md:rounded-none">
    <div className="flex items-center gap-3 md:mx-auto md:max-w-5xl">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={onBack}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"
      >
        <ArrowLeftIcon />
      </button>
      <div>
        <h1 className="text-xl font-bold text-white">Lịch sử các buổi</h1>
        <p className="text-sm text-emerald-100">
          {count} buổi đã lưu · tháng này: {thisMonth} buổi
        </p>
      </div>
    </div>
  </header>
);

export default HistoryHeader;
