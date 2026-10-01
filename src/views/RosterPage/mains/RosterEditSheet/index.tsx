// libs
import { motion } from "motion/react";
import { Drawer } from "vaul";
// types
import type { Gender } from "@/types/Session";
import type { RosterEntry } from "@/types/Storage";

const RosterEditSheet = ({
  open,
  editingEntry,
  editName,
  editError,
  onNameChange,
  onCommitRename,
  onGenderChange,
  onClose
}: {
  open: boolean;
  editingEntry: RosterEntry | null;
  editName: string;
  editError: string;
  onNameChange: (name: string) => void;
  onCommitRename: () => void;
  onGenderChange: (gender: Gender) => void;
  onClose: () => void;
}) => (
  <Drawer.Root
    open={open}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white outline-none">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
        <div className="mx-auto max-w-lg p-4 pb-8">
          <Drawer.Title className="mb-3 font-bold text-gray-900">
            Sửa người chơi trong danh bạ
          </Drawer.Title>
          <Drawer.Description className="sr-only">
            Chỉnh sửa tên và giới tính trong danh bạ
          </Drawer.Description>
          {editingEntry && (
            <div className="flex flex-col gap-2">
              <div>
                <input
                  aria-label={`Tên của ${editingEntry.name}`}
                  value={editName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={onCommitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  className="h-11 w-full rounded-xl border border-gray-300 px-3 text-base"
                />
                {editError && (
                  <p className="mt-1 text-sm text-red-500">{editError}</p>
                )}
              </div>
              <div className="flex overflow-hidden rounded-xl border border-gray-300">
                <button
                  type="button"
                  aria-pressed={editingEntry.gender === "male"}
                  aria-label={`Đặt Nam cho ${editingEntry.name}`}
                  onClick={() => onGenderChange("male")}
                  className={`relative h-11 flex-1 text-sm font-semibold ${
                    editingEntry.gender === "male"
                      ? "text-white"
                      : "bg-white text-gray-500"
                  }`}
                >
                  {editingEntry.gender === "male" && (
                    <motion.div
                      layoutId="roster-gender-edit-pill"
                      className="absolute inset-0 bg-emerald-600"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.3
                      }}
                    />
                  )}
                  <span className="relative z-10">Nam</span>
                </button>
                <button
                  type="button"
                  aria-pressed={editingEntry.gender === "female"}
                  aria-label={`Đặt Nữ cho ${editingEntry.name}`}
                  onClick={() => onGenderChange("female")}
                  className={`relative h-11 flex-1 text-sm font-semibold ${
                    editingEntry.gender === "female"
                      ? "text-white"
                      : "bg-white text-gray-500"
                  }`}
                >
                  {editingEntry.gender === "female" && (
                    <motion.div
                      layoutId="roster-gender-edit-pill"
                      className="absolute inset-0 bg-pink-500"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.3
                      }}
                    />
                  )}
                  <span className="relative z-10">Nữ</span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white"
              >
                Xong
              </button>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

export default RosterEditSheet;
