// libs
import { useState } from "react";
import { Drawer } from "vaul";
// types
import type { Player } from "@/types/Session";
// components
import GenderBadge from "@/components/GenderBadge";
import { CheckIcon } from "@/components/Icons";
// others
import { payerSummary } from "@/utils/payer";

/**
 * Multi-select of who shares one extra cost: a compact trigger opens a vaul
 * bottom sheet with a checkbox per player. Modelled on TimeSelect, but with
 * apply-on-tap semantics instead of a draft committed by "Xong": every other
 * field in the app edits in place, and the user needs the result panel to move
 * with each tick to see whether they picked the right group. Drag-down /
 * overlay tap / Esc therefore KEEP the ticks and only close the sheet.
 *
 * A native <select multiple> is deliberately avoided — same reason TimeSelect
 * avoids <input type="time">: the host OS dialog is ugly and differs between
 * iOS and Android.
 */
const PayerSelect = ({
  players,
  value,
  onChange,
  "aria-label": label,
  className = ""
}: {
  players: Player[];
  value: string[]; // = extra.playerIds
  onChange: (playerIds: string[]) => void;
  "aria-label": string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const allSelected =
    players.length > 0 && players.every((p) => value.includes(p.id));
  const summary = payerSummary(players, value);
  const isEmpty = players.filter((p) => value.includes(p.id)).length === 0;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={`flex h-11 items-center justify-between gap-1 rounded-xl border border-gray-300 px-3 text-left text-sm ${
          isEmpty ? "text-gray-400" : "text-gray-900"
        } ${className}`}
      >
        <span className="truncate">{summary}</span>
        <span className="shrink-0 text-gray-400">▾</span>
      </button>

      <Drawer.Root
        open={open}
        onOpenChange={(o: boolean) => {
          // drag-down / overlay tap / Esc all land here with o=false; the ticks
          // are already committed, so this only closes the sheet
          if (!o) setOpen(false);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-white outline-none">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
            <div className="mx-auto max-w-lg p-4 pb-6">
              <Drawer.Title className="mb-2 text-center font-bold text-gray-900">
                {label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Chọn một hoặc nhiều người cùng chịu khoản này — số tiền chia đều
                theo đầu người
              </Drawer.Description>
              {/* data-vaul-no-drag: scrolling a 12-player list must not drag the sheet down */}
              <div data-vaul-no-drag>
                <div className="mb-2 border-b border-gray-100 pb-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={allSelected}
                    aria-label="Cả nhóm"
                    onClick={() =>
                      onChange(allSelected ? [] : players.map((p) => p.id))
                    }
                    className={`flex h-12 w-full items-center justify-between gap-2 rounded-xl px-3 ${
                      allSelected ? "bg-emerald-50" : "bg-gray-50"
                    }`}
                  >
                    <span className="font-semibold text-gray-900">
                      Cả nhóm{" "}
                      <span className="text-xs font-normal text-gray-400">
                        {players.length} người
                      </span>
                    </span>
                    {allSelected && (
                      <span className="shrink-0 text-emerald-600">
                        <CheckIcon size={18} />
                      </span>
                    )}
                  </button>
                </div>
                <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
                  {players.map((p) => {
                    const checked = value.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`${p.name} · ${p.gender === "male" ? "Nam" : "Nữ"}`}
                        onClick={() =>
                          onChange(
                            checked
                              ? value.filter((id) => id !== p.id)
                              : [...value, p.id]
                          )
                        }
                        className={`flex h-12 w-full items-center gap-2 rounded-xl px-3 ${
                          checked ? "bg-emerald-50" : "bg-gray-50"
                        }`}
                      >
                        <GenderBadge gender={p.gender} />
                        <span className="truncate text-gray-900">{p.name}</span>
                        {checked && (
                          <span className="ml-auto shrink-0 text-emerald-600">
                            <CheckIcon size={18} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white"
              >
                Xong
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default PayerSelect;
