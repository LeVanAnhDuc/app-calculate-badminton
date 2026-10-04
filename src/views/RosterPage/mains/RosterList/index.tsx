// libs
import { useMemo, useRef } from "react";
// types
import type { RosterEntry } from "@/types/Storage";
// components
import DeleteButton from "@/components/DeleteButton";
import { ChevronIcon, PencilIcon } from "@/components/Icons";
import SwipeToDelete from "@/components/SwipeToDelete";
import RosterAvatar from "../../components/RosterAvatar";
// others
import { groupByLetter, matchesQuery } from "@/utils/alphabet";

const RosterList = ({
  roster,
  query,
  openSwipeName,
  onOpenSwipeChange,
  onEdit,
  onDelete
}: {
  roster: RosterEntry[];
  query: string;
  openSwipeName: string | null;
  onOpenSwipeChange: (name: string | null) => void;
  onEdit: (entry: RosterEntry) => void;
  onDelete: (name: string) => void;
}) => {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const railRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(
    () =>
      groupByLetter(roster.filter((entry) => matchesQuery(entry.name, query))),
    [roster, query]
  );
  const letters = groups.map((g) => g.letter);
  const showRail = query.trim() === "" && letters.length > 1;

  // jsdom has no scrollIntoView, and older mobile browsers ignore the options
  const jumpTo = (letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView?.({ block: "start" });
  };

  // dragging a finger down the rail scrubs through the sections, like iOS
  const scrubTo = (clientY: number) => {
    const rail = railRef.current;
    if (!rail || letters.length === 0) return;
    const { top, height } = rail.getBoundingClientRect();
    if (height === 0) return;
    const index = Math.floor(((clientY - top) / height) * letters.length);
    jumpTo(letters[Math.min(letters.length - 1, Math.max(0, index))]);
  };

  return (
    // md:pr-14 keeps the right column clear of the A–Z rail until the window
    // is wide enough (>=1136px) for the rail to sit outside the 1024px column
    <main className="relative mt-3 min-[1136px]:pr-6 md:mx-auto md:mt-0 md:max-w-5xl md:px-6 md:py-6 md:pr-14">
      {roster.length > 0 && (
        <p className="pb-2 text-center text-xs text-gray-400 md:pb-4">
          <span className="md:hidden">💡 Vuốt trái để xóa</span>
          <span className="hidden md:inline">
            💡 Bấm nút thùng rác đỏ để xóa
          </span>
        </p>
      )}
      {roster.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          Danh bạ chưa có ai — bấm + để thêm, hoặc thêm người chơi trong buổi.
        </p>
      ) : groups.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          Không tìm thấy ai tên "{query.trim()}"
        </p>
      ) : (
        // Plain (non-animated) rows: entries are keyed by name, and a
        // rename changes that name — animating mount/unmount on rename
        // would misrepresent a rename as delete+add, so rows update
        // in place instead.
        // from md the groups flow into two columns; a group is never split
        <div className="md:columns-2 md:gap-6">
          {groups.map((group) => (
            <section
              key={group.letter}
              className="md:mb-4 md:break-inside-avoid"
              ref={(el) => {
                sectionRefs.current[group.letter] = el;
              }}
            >
              <h2 className="sticky top-0 z-10 bg-[#F2F2F7]/90 px-4 py-1 text-[13px] font-semibold tracking-wide text-gray-500 uppercase backdrop-blur-sm md:static md:bg-transparent md:px-0 md:backdrop-blur-none">
                {group.letter}
              </h2>
              <ul className="mx-4 overflow-hidden rounded-xl bg-white shadow-sm md:mx-0">
                {group.items.map((entry, i) => {
                  const isOpen = openSwipeName === entry.name;
                  const isLast = i === group.items.length - 1;
                  return (
                    <li key={entry.name}>
                      <SwipeToDelete
                        testId={`roster-swipe-row-${entry.name}`}
                        label={`Xóa nhanh ${entry.name}`}
                        isOpen={isOpen}
                        onOpenChange={(open) =>
                          onOpenSwipeChange(open ? entry.name : null)
                        }
                        onDelete={() => onDelete(entry.name)}
                        surfaceClassName={`bg-white flex items-center ${
                          isLast
                            ? ""
                            : "after:absolute after:bottom-0 after:left-16 after:right-0 after:h-px after:bg-gray-200"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-2 pl-3 text-left"
                          onClick={() => onEdit(entry)}
                        >
                          <RosterAvatar entry={entry} />
                          <span className="truncate font-medium text-gray-900">
                            {entry.name}
                          </span>
                          <span className="sr-only">
                            {entry.gender === "male" ? "Nam" : "Nữ"}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1 pr-2">
                          <button
                            type="button"
                            aria-label={`Sửa ${entry.name}`}
                            title="Sửa"
                            onClick={() => onEdit(entry)}
                            className="hidden items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 md:flex md:h-11 md:w-11"
                          >
                            <PencilIcon />
                          </button>
                          <DeleteButton
                            label={`Xóa ${entry.name}`}
                            onClick={() => onDelete(entry.name)}
                          />
                          <span className="text-gray-300 md:hidden">
                            <ChevronIcon />
                          </span>
                        </div>
                      </SwipeToDelete>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {showRail && (
        <div
          ref={railRef}
          data-testid="roster-index-rail"
          onTouchStart={(e) => scrubTo(e.touches[0].clientY)}
          onTouchMove={(e) => scrubTo(e.touches[0].clientY)}
          // fixed so it stays put while the list scrolls; on wide screens
          // the calc parks it just outside the centered column (max-w-2xl
          // = 672px, so its edge sits 50vw - 336px from the window edge)
          // instead of letting it drift off to the window edge.
          // right-1 (4px) thay vì right-0.5: 2px vừa đè lên mũi ">" của
          // hàng (danh sách có mx-4) vừa lọt vùng vuốt-để-back của Android.
          // Nền mờ để chữ không chồng lên nội dung phía dưới.
          className="fixed top-1/2 right-1 z-20 flex -translate-y-1/2 touch-none flex-col items-center rounded-full bg-white/70 py-1 backdrop-blur-sm select-none md:right-[max(0.25rem,calc(50vw-560px))]"
        >
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              aria-label={`Tới nhóm ${letter}`}
              onClick={() => jumpTo(letter)}
              // 44x28 chứ không 44x44: 26 chữ cái xếp dọc không thể mỗi chữ
              // cao 44px trong màn 844px. Thao tác chính của rail là vuốt
              // (onTouchStart/onTouchMove ở trên), bấm từng chữ chỉ là phụ —
              // đây là đánh đổi có chủ ý. -my-1.5 giữ nguyên khoảng cách
              // hiển thị giữa các chữ dù ô chạm cao hơn.
              className="-my-1.5 h-7 w-11 text-[11px] leading-none font-semibold text-emerald-600"
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      <p className="px-4 pt-6 text-center text-xs text-gray-400">
        Danh bạ tự bổ sung khi bạn thêm người chơi mới trong buổi
      </p>
    </main>
  );
};

export default RosterList;
