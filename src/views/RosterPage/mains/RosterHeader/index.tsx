// components
import {
  ArrowLeftIcon,
  CloseIcon,
  PlusIcon,
  SearchSmallIcon
} from "@/components/Icons";

const RosterHeader = ({
  count,
  query,
  onQueryChange,
  onAdd,
  onBack
}: {
  count: number;
  query: string;
  onQueryChange: (query: string) => void;
  onAdd: () => void;
  onBack: () => void;
}) => (
  <header className="rounded-b-3xl bg-emerald-600 px-4 pt-8 pb-4 md:rounded-none md:px-0 md:py-5">
    {/* flex-wrap: mobile = [←][tiêu đề][+] then the search on its own row;
        md = [←][tiêu đề][tìm kiếm][+] on one row */}
    <div className="flex flex-wrap items-center gap-3 md:mx-auto md:max-w-5xl md:flex-nowrap md:px-6">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={onBack}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"
      >
        <ArrowLeftIcon />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-white md:text-2xl">
          Danh bạ người chơi
        </h1>
        <p className="text-sm text-emerald-100">{count} người đã lưu</p>
      </div>
      {count > 0 && (
        <div className="relative order-last mt-1 w-full md:order-none md:mt-0 md:w-80">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-emerald-100">
            <SearchSmallIcon />
          </span>
          <input
            type="search"
            aria-label="Tìm trong danh bạ"
            placeholder="Tìm kiếm"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-11 w-full rounded-xl bg-emerald-700/60 pr-9 pl-9 text-base text-white outline-none placeholder:text-emerald-200"
          />
          {query !== "" && (
            <button
              type="button"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-emerald-100"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label="Thêm vào danh bạ"
        onClick={onAdd}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"
      >
        <PlusIcon />
      </button>
    </div>
  </header>
);

export default RosterHeader;
