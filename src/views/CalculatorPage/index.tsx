// types
import type {
  CalcResult,
  Gender,
  SessionInput,
  ShuttleType
} from "@/types/Session";
import type { RosterEntry } from "@/types/Storage";
// components
import AccountButton from "./mains/AccountButton";
import CostForm from "./mains/CostForm";
import InstallBanner from "./mains/InstallBanner";
import ModeSwitch from "./mains/ModeSwitch";
import PlayerList from "./mains/PlayerList";
import RatioInputs from "./mains/RatioInputs";
import ResultPanel from "./mains/ResultPanel";
import RoundingToggle from "./mains/RoundingToggle";

const CalculatorPage = ({
  session,
  roster,
  frequent,
  shuttleTypes,
  result,
  errors,
  saveDisabled,
  onPatch,
  onAddPlayer,
  onRemovePlayer,
  onChangeGender,
  onRenamePlayer,
  onSave,
  onNewSession,
  onOpenHistory,
  onOpenRoster,
  onOpenAccount
}: {
  session: SessionInput;
  roster: RosterEntry[];
  frequent: RosterEntry[];
  shuttleTypes: ShuttleType[];
  result: CalcResult | null;
  errors: string[];
  saveDisabled: boolean;
  onPatch: (patch: Partial<SessionInput>) => void;
  onAddPlayer: (name: string, gender: Gender) => void;
  onRemovePlayer: (playerId: string) => void;
  onChangeGender: (playerId: string, gender: Gender) => void;
  onRenamePlayer: (playerId: string, newName: string) => void;
  onSave: () => void;
  onNewSession: () => void;
  onOpenHistory: () => void;
  onOpenRoster: () => void;
  onOpenAccount: () => void;
}) => (
  <div className="min-h-dvh bg-gray-100">
    {/* pb gộp 2rem + safe-area để nút cuối trang không nằm dưới vạch home
            indicator; gộp vào một class thay vì thêm pb riêng vì hai utility
            padding-bottom trên cùng element sẽ đè nhau theo thứ tự CSS */}
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-gray-50 pb-[calc(2rem+env(safe-area-inset-bottom))] md:max-w-none md:bg-gray-100 md:pb-0">
      <header className="rounded-b-3xl bg-emerald-600 px-4 pt-8 pb-6 md:rounded-none md:px-0 md:py-5">
        <div className="flex items-start justify-between gap-3 md:mx-auto md:max-w-5xl md:items-center md:px-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">
              🏸 Tính tiền cầu lông
            </h1>
            <p className="mt-1 text-sm text-emerald-100">
              Chia tiền nhanh sau buổi chơi
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* mobile reaches these through the links under the result panel */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="hidden h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white md:block"
            >
              Lịch sử các buổi
            </button>
            <button
              type="button"
              onClick={onOpenRoster}
              className="hidden h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white md:block"
            >
              Danh bạ
            </button>
            <AccountButton onOpenAccount={onOpenAccount} />
          </div>
        </div>
      </header>
      <main className="-mt-2 space-y-4 px-4 md:mx-auto md:mt-0 md:grid md:max-w-5xl md:grid-cols-5 md:items-start md:gap-6 md:space-y-0 md:px-6 md:py-6">
        <div className="mt-4 md:col-span-5 md:mt-0 md:max-w-md">
          <ModeSwitch
            mode={session.mode}
            onChange={(mode) => onPatch({ mode })}
          />
        </div>
        <div className="mt-4 space-y-4 md:col-span-3 md:mt-0">
          <CostForm
            input={session}
            shuttleTypes={shuttleTypes}
            onPatch={onPatch}
          />
          <RatioInputs
            maleRatio={session.maleRatio}
            femaleRatio={session.femaleRatio}
            note={
              session.mode === "hourly"
                ? "Chỉ áp dụng cho tiền cầu — tiền sân chia theo giờ chơi"
                : undefined
            }
            onChange={onPatch}
          />
          <PlayerList
            input={session}
            roster={roster}
            frequent={frequent}
            onPatch={onPatch}
            onAddPlayer={onAddPlayer}
            onRemovePlayer={onRemovePlayer}
            onChangeGender={onChangeGender}
            onRenamePlayer={onRenamePlayer}
          />
          <RoundingToggle
            rounding={session.rounding}
            onChange={(rounding) => onPatch({ rounding })}
          />
        </div>
        <div className="mt-4 space-y-4 md:sticky md:top-6 md:col-span-2 md:mt-0 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
          <ResultPanel
            result={result}
            mode={session.mode}
            errors={errors}
            players={session.players}
            onSave={onSave}
            onNewSession={onNewSession}
            onPatch={onPatch}
            saveDisabled={saveDisabled}
          />
          <button
            type="button"
            onClick={onOpenHistory}
            className="h-12 w-full text-sm font-semibold text-emerald-700 md:hidden"
          >
            Xem lịch sử các buổi →
          </button>
          <button
            type="button"
            onClick={onOpenRoster}
            className="h-12 w-full text-sm font-semibold text-emerald-700 md:hidden"
          >
            Danh bạ người chơi →
          </button>
        </div>
      </main>
      <InstallBanner />
    </div>
  </div>
);

export default CalculatorPage;
