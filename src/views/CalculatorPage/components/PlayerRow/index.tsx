// libs
import { useState } from "react";
import { motion, Reorder, useDragControls } from "motion/react";
// types
import type { Gender, Mode, Player } from "@/types/Session";
// components
import DeleteButton from "@/components/DeleteButton";
import GenderBadge from "@/components/GenderBadge";
import { PencilIcon, DragHandleIcon } from "@/components/Icons";
import SwipeToDelete from "@/components/SwipeToDelete";

const PlayerRow = ({
  player,
  mode,
  timeLabel,
  isSwipeOpen,
  onSwipeOpenChange,
  onRemove,
  onChangeGender,
  onEdit,
  onToggleHalf,
  onDraggingChange
}: {
  player: Player;
  mode: Mode;
  timeLabel: string;
  isSwipeOpen: boolean;
  onSwipeOpenChange: (id: string | null) => void;
  onRemove: (id: string) => void;
  onChangeGender: (id: string, gender: Gender) => void;
  onEdit: (player: Player) => void;
  onToggleHalf: (player: Player) => void;
  onDraggingChange: (dragging: boolean) => void;
}) => {
  const dragControls = useDragControls();
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      value={player}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)" }}
      onDragStart={() => {
        setDragging(true);
        onSwipeOpenChange(null);
        onDraggingChange(true);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDraggingChange(false);
      }}
      className={`relative ${dragging ? "z-10" : ""}`}
    >
      <SwipeToDelete
        testId={`swipe-row-${player.id}`}
        label={`Xóa nhanh ${player.name}`}
        isOpen={isSwipeOpen}
        onOpenChange={(open) => onSwipeOpenChange(open ? player.id : null)}
        onDelete={() => onRemove(player.id)}
        disabled={dragging}
        surfaceClassName="bg-white py-2.5"
      >
        {/* Các nút đứng một mình (avatar, tên) nới vùng chạm lên 44px bằng
              margin âm: diện mạo và chiều cao hàng giữ nguyên như cũ. */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={`Sắp xếp ${player.name}`}
              title="Kéo để sắp xếp"
              onPointerDown={(e) => {
                e.preventDefault();
                dragControls.start(e);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              className="-my-2 -ml-2 flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-gray-300 active:cursor-grabbing"
            >
              <DragHandleIcon />
            </button>
            <button
              type="button"
              aria-label={`Đổi giới tính ${player.name}`}
              title="Đổi giới tính"
              onClick={() =>
                onChangeGender(
                  player.id,
                  player.gender === "male" ? "female" : "male"
                )
              }
              className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <GenderBadge gender={player.gender} />
            </button>
            <button
              type="button"
              className="-my-2 flex min-h-11 min-w-0 flex-col justify-center py-2 text-left"
              onClick={() => onEdit(player)}
            >
              <span className="block truncate font-medium text-gray-900">
                {player.name}
              </span>
              {mode === "hourly" && (
                <span
                  className={`text-xs ${
                    player.startTime === null
                      ? "text-gray-400"
                      : "font-semibold text-emerald-700"
                  }`}
                >
                  {timeLabel}
                </span>
              )}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {mode === "ratio" && (
              <motion.button
                type="button"
                aria-pressed={player.halfSession}
                aria-label={`½ buổi ${player.name}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleHalf(player)}
                className={`h-11 rounded-full px-2.5 text-xs font-semibold transition-colors duration-200 ${
                  player.halfSession
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 text-gray-400"
                }`}
              >
                {player.halfSession ? "½ buổi ✓" : "½ buổi"}
              </motion.button>
            )}
            <button
              type="button"
              aria-label={`Sửa ${player.name}`}
              title="Sửa"
              onClick={() => onEdit(player)}
              className="hidden items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 md:flex md:h-10 md:w-10"
            >
              <PencilIcon />
            </button>
            <DeleteButton
              label={`Xóa ${player.name}`}
              onClick={() => onRemove(player.id)}
            />
          </div>
        </div>
      </SwipeToDelete>
    </Reorder.Item>
  );
};

export default PlayerRow;
