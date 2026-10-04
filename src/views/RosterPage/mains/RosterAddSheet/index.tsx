// libs
import { motion } from "motion/react";
import { Drawer } from "vaul";
// types
import type { Gender } from "@/types/Session";

const RosterAddSheet = ({
  open,
  onOpenChange,
  addName,
  addGender,
  addError,
  onNameChange,
  onGenderChange,
  onAdd
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addName: string;
  addGender: Gender;
  addError: string;
  onNameChange: (name: string) => void;
  onGenderChange: (gender: Gender) => void;
  onAdd: () => void;
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white outline-none">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
        <div className="mx-auto max-w-lg p-4 pb-8">
          <Drawer.Title className="mb-3 font-bold text-gray-900">
            Thêm người vào danh bạ
          </Drawer.Title>
          <Drawer.Description className="sr-only">
            Nhập tên và giới tính để lưu vào danh bạ
          </Drawer.Description>
          <div className="flex gap-2">
            <input
              placeholder="Tên người chơi"
              value={addName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 px-3 text-base"
            />
            <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-300">
              {(["male", "female"] as Gender[]).map((g) => {
                const active = addGender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onGenderChange(g)}
                    className={`relative h-12 px-3 text-sm font-semibold ${
                      active ? "text-white" : "bg-white text-gray-500"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="roster-gender-add-pill"
                        className={`absolute inset-0 ${
                          g === "male" ? "bg-emerald-600" : "bg-pink-500"
                        }`}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.3
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {g === "male" ? "Nam" : "Nữ"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {addError && <p className="mt-2 text-sm text-red-500">{addError}</p>}
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white"
          >
            + Thêm vào danh bạ
          </button>
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

export default RosterAddSheet;
