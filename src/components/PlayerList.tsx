import { useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { Drawer } from "vaul";
import type { RosterEntry } from "../lib/storage";
import { durationHours, formatHours } from "../lib/time";
import type { Gender, Player, SessionInput } from "../lib/types";
import { useEdgeAutoScroll } from "../lib/useEdgeAutoScroll";
import { Avatar } from "./Avatar";
import { GenderBadge } from "./GenderBadge";
import { CloseIcon, PlusIcon, SearchIcon } from "./icons";
import { PlayerRow } from "./PlayerRow";
import { TimeSelect } from "./TimeSelect";

interface Props {
  input: SessionInput;
  roster: RosterEntry[];
  /**
   * Những người hay gặp, đã xếp hạng & lọc sẵn bởi App (suy ra từ lịch sử).
   * Component này chỉ hiển thị — không nhận `history` thô.
   */
  frequent: RosterEntry[];
  onPatch: (p: Partial<SessionInput>) => void;
  onAddPlayer: (name: string, gender: Gender) => void;
  /**
   * Only reports which player to drop — the removal itself (and the "Hoàn
   * tác" toast that can put it back) is owned by App, so undo can re-insert
   * into the freshest list instead of a snapshot captured here.
   */
  onRemovePlayer: (playerId: string) => void;
  onChangeGender: (playerId: string, gender: Gender) => void;
  onRenamePlayer: (playerId: string, newName: string) => void;
}

export function PlayerList({
  input,
  roster,
  frequent,
  onPatch,
  onAddPlayer,
  onRemovePlayer,
  onChangeGender,
  onRenamePlayer
}: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEdgeAutoScroll(isDragging);

  const males = input.players.filter((p) => p.gender === "male").length;
  const females = input.players.length - males;

  const inSession = (n: string) =>
    input.players.some((p) => p.name.toLowerCase() === n.trim().toLowerCase());

  const trimmedName = name.trim();

  const suggestions = trimmedName
    ? roster.filter(
        (r) =>
          r.name.toLowerCase().startsWith(trimmedName.toLowerCase()) &&
          !inSession(r.name)
      )
    : [];

  // Chip chỉ hiện khi chưa gõ gì — gõ vào thì gợi ý "Từ danh bạ" tiếp quản.
  const showFrequent = trimmedName === "" && frequent.length > 0;

  const rosterMatch = trimmedName
    ? (roster.find((r) => r.name.toLowerCase() === trimmedName.toLowerCase()) ??
      null)
    : null;
  const showNewHint =
    trimmedName !== "" && rosterMatch === null && !inSession(trimmedName);
  const showRosterHint = rosterMatch !== null;
  const alreadyInSession = trimmedName !== "" && inSession(trimmedName);

  // Nút "Hủy" kiểu iOS: hiện khi ô đang được dùng, kể cả lúc mới focus mà chưa gõ.
  const showCancel = focused || trimmedName !== "";

  const genderLabel = (g: Gender) => (g === "male" ? "Nam" : "Nữ");

  /**
   * Gợi ý từ danh bạ và hai hàng "thêm người mới" nằm chung một khối bo góc
   * kiểu iOS, nên phải biết hàng nào là hàng cuối để bỏ đường kẻ ngăn — gộp
   * sẵn thành một mảng thay vì render hai đoạn rời rồi đoán.
   *
   * Hai hàng "người mới" chỉ dành cho mobile: desktop vẫn có cặp [Nam][Nữ] và
   * nút "+ Thêm người chơi" nên không cần chúng.
   */
  const resultRows = [
    ...suggestions.slice(0, 6).map((r) => ({
      key: `roster-${r.name}`,
      name: r.name,
      gender: r.gender,
      isNew: false,
      label: `${r.name} · ${genderLabel(r.gender)}`
    })),
    ...(showNewHint
      ? (["male", "female"] as Gender[]).map((g) => ({
          key: `new-${g}`,
          name: trimmedName,
          gender: g,
          isNew: true,
          label: `Thêm "${trimmedName}" là người mới · ${genderLabel(g)}`
        }))
      : [])
  ];

  const resetSearch = () => {
    setName("");
    setError("");
  };

  const add = (n: string, g: Gender) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    if (inSession(trimmed)) {
      setError(`"${trimmed}" đã có trong buổi`);
      return;
    }
    setError("");
    setName("");
    onAddPlayer(trimmed, g);
  };

  const updatePlayer = (id: string, patch: Partial<Player>) =>
    onPatch({
      players: input.players.map((p) => (p.id === id ? { ...p, ...patch } : p))
    });

  const removePlayer = (id: string) => {
    setOpenSwipeId(null);
    onRemovePlayer(id);
  };

  const openEdit = (p: Player) => {
    setOpenSwipeId(null);
    setEditingId(p.id);
    setEditName(p.name);
    setEditError("");
  };

  const commitRename = (p: Player) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(p.name);
      setEditError("");
      return;
    }
    const isDuplicate = input.players.some(
      (o) => o.id !== p.id && o.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(`"${trimmed}" đã có trong buổi`);
      return;
    }
    setEditError("");
    if (trimmed !== p.name) {
      onRenamePlayer(p.id, trimmed);
    }
  };

  const editingPlayer = input.players.find((p) => p.id === editingId) ?? null;

  const closeEdit = () => {
    if (editingPlayer) commitRename(editingPlayer);
    setEditingId(null);
  };

  const timeLabel = (p: Player) => {
    const s = p.startTime ?? input.courtStart;
    const e = p.endTime ?? input.courtEnd;
    const full = p.startTime === null && p.endTime === null;
    return `${s}–${e} · ${full ? "cả buổi" : formatHours(durationHours(s, e))}`;
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Người chơi</h2>
        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
          {males} nam · {females} nữ
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="mb-3 space-y-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
      >
        <p>💡 Bấm avatar để đổi giới tính</p>
        <p>💡 Bấm tên để sửa thông tin người chơi</p>
        <p>💡 Kéo ⠿ để sắp xếp thứ tự</p>
        <p>
          <span className="md:hidden">💡 Vuốt trái để xóa</span>
          <span className="hidden md:inline">
            💡 Bấm nút thùng rác đỏ để xóa
          </span>
        </p>
      </motion.div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          {/* Kính lúp chỉ có ở mobile — desktop vẫn là ô nhập kèm [Nam][Nữ] như cũ. */}
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 md:hidden">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            placeholder="Tìm hoặc thêm tên"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && add(name, gender)}
            className="h-12 w-full rounded-full border border-transparent bg-gray-100 pr-11 pl-10 text-base focus:ring-2 focus:ring-emerald-500/40 focus:outline-none md:rounded-xl md:border-gray-300 md:bg-white md:px-3"
          />
          {trimmedName !== "" && (
            <button
              type="button"
              aria-label="Xóa chữ đã gõ"
              // giữ focus lại cho ô nhập: mất focus thì bàn phím mobile sập
              // xuống rồi lại bật lên, và nút "Hủy" nhấp nháy theo
              onMouseDown={(e) => e.preventDefault()}
              onClick={resetSearch}
              className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-400 text-white md:hidden"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showCancel && (
            <motion.button
              key="cancel-search"
              type="button"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                resetSearch();
                setFocused(false);
                inputRef.current?.blur();
              }}
              className="h-12 shrink-0 px-1 text-sm font-semibold whitespace-nowrap text-emerald-600 md:hidden"
            >
              Hủy
            </motion.button>
          )}
        </AnimatePresence>

        <div className="hidden shrink-0 overflow-hidden rounded-xl border border-gray-300 md:flex">
          {(["male", "female"] as Gender[]).map((g) => {
            const active = gender === g;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => setGender(g)}
                className={`relative h-12 px-3 text-sm font-semibold ${
                  active ? "text-white" : "bg-white text-gray-500"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="gender-add-pill"
                    className={`absolute inset-0 ${g === "male" ? "bg-emerald-600" : "bg-pink-500"}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
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

      {/* Mobile đã có hai hàng "Thêm ... là người mới" nói đúng điều này rồi. */}
      {showNewHint && (
        <p className="mt-1.5 hidden px-1 text-xs text-emerald-700 md:block">
          ✨ Người mới — sẽ được thêm vào danh bạ
        </p>
      )}
      {showRosterHint && (
        <p className="mt-1.5 px-1 text-xs text-gray-400">
          📇 Có trong danh bạ — bấm thẻ gợi ý để thêm đúng giới tính
        </p>
      )}
      {alreadyInSession && (
        <p className="mt-1.5 px-1 text-xs text-gray-400 md:hidden">
          👥 "{trimmedName}" đang có trong buổi rồi
        </p>
      )}

      <AnimatePresence>
        {resultRows.length > 0 && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-2 flex flex-col gap-2"
          >
            {suggestions.length > 0 && (
              <p className="px-1 text-xs font-semibold tracking-wide text-gray-400 uppercase md:tracking-normal md:normal-case">
                Từ danh bạ
              </p>
            )}
            {/* Mobile: một khối bo góc, các hàng ngăn nhau bằng kẻ mảnh thụt vào
                ngang chỗ chữ. Desktop: bung lại thành từng thẻ viền rời như cũ. */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white md:gap-2 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
              {resultRows.map((row, i) => (
                <button
                  key={row.key}
                  type="button"
                  aria-label={row.label}
                  onClick={() => add(row.name, row.gender)}
                  className={`flex h-12 w-full items-center gap-3 bg-white pl-3 text-left hover:bg-gray-50 md:gap-2 md:rounded-xl md:border md:border-gray-200 ${
                    row.isNew ? "md:hidden" : ""
                  }`}
                >
                  {row.isNew ? (
                    // Tô theo giới tính chứ không dùng một màu "thêm" chung: hai
                    // hàng chỉ khác nhau ở giới tính nên phải nhìn là thấy ngay.
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        row.gender === "male"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      <PlusIcon size={18} />
                    </span>
                  ) : (
                    <>
                      <span className="md:hidden">
                        <Avatar name={row.name} gender={row.gender} />
                      </span>
                      <span className="hidden md:inline-flex">
                        <GenderBadge gender={row.gender} />
                      </span>
                    </>
                  )}
                  <span
                    className={`flex h-full min-w-0 flex-1 items-center gap-2 pr-3 md:border-b-0 ${
                      i === resultRows.length - 1
                        ? ""
                        : "border-b border-gray-100"
                    }`}
                  >
                    <span
                      className={`min-w-0 flex-1 truncate font-medium ${
                        row.isNew ? "text-emerald-700" : "text-gray-900"
                      }`}
                    >
                      {row.isNew ? `Thêm "${row.name}" là người mới` : row.name}
                    </span>
                    <span
                      className={`shrink-0 text-xs ${
                        row.isNew
                          ? `font-semibold ${row.gender === "male" ? "text-emerald-600" : "text-pink-500"}`
                          : "text-gray-400"
                      }`}
                    >
                      {genderLabel(row.gender)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFrequent && (
          <motion.div
            key="frequent"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-2 flex flex-col gap-2"
          >
            <p className="px-1 text-xs font-semibold tracking-wide text-gray-400 uppercase md:tracking-normal md:normal-case">
              Hay chơi cùng
            </p>
            {/* Mobile: rail cuộn ngang kiểu Share Sheet — avatar tròn, tên ở dưới,
                một hàng cố định thay vì 3–4 hàng chip xuống dòng. `-mx-4 px-4` cho
                dải chạy sát mép thẻ, chip bị cắt ở mép phải là tín hiệu còn nữa.
                Desktop: vẫn là chip chữ xuống dòng như cũ. */}
            <div className="no-scrollbar -mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 md:pb-0">
              {frequent.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  aria-label={`Thêm ${r.name} · ${genderLabel(r.gender)}`}
                  onClick={() => add(r.name, r.gender)}
                  className="flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl py-1 active:bg-gray-100 md:h-12 md:w-auto md:flex-row md:gap-2 md:rounded-full md:border md:border-gray-200 md:bg-white md:py-0 md:pr-4 md:pl-2 md:hover:bg-gray-50"
                >
                  <span className="md:hidden">
                    <Avatar
                      name={r.name}
                      gender={r.gender}
                      className="h-12 w-12 text-sm"
                    />
                  </span>
                  <span className="hidden md:inline-flex">
                    <GenderBadge gender={r.gender} />
                  </span>
                  <span className="w-full truncate px-0.5 text-center text-[11px] leading-tight text-gray-600 md:w-auto md:px-0 md:text-sm md:font-medium md:text-gray-900">
                    {r.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {/* Mobile thêm người ngay từ hàng gợi ý (kể cả tên mới), nên nút này chỉ
          còn cần cho desktop — nơi giới tính chọn ở cặp [Nam][Nữ] bên cạnh ô nhập. */}
      <button
        type="button"
        onClick={() => add(name, gender)}
        className="mt-2 hidden h-12 w-full rounded-xl border-2 border-dashed border-emerald-300 text-sm font-semibold text-emerald-600 md:block"
      >
        + Thêm người chơi
      </button>

      {input.players.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-4 text-center text-sm text-gray-400"
        >
          Chưa có người chơi nào
        </motion.p>
      ) : (
        <Reorder.Group
          axis="y"
          values={input.players}
          onReorder={(players: Player[]) => onPatch({ players })}
          className="mt-3 divide-y divide-gray-100"
        >
          <AnimatePresence initial={false}>
            {input.players.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                mode={input.mode}
                timeLabel={timeLabel(p)}
                isSwipeOpen={openSwipeId === p.id}
                onSwipeOpenChange={setOpenSwipeId}
                onRemove={removePlayer}
                onChangeGender={onChangeGender}
                onEdit={openEdit}
                onToggleHalf={(pl) =>
                  updatePlayer(pl.id, { halfSession: !pl.halfSession })
                }
                onDraggingChange={setIsDragging}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      {input.players.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {input.mode === "hourly"
            ? "Bấm vào tên để sửa thông tin người chơi (kể cả giờ chơi)"
            : "Bấm vào tên để sửa thông tin người chơi"}
        </p>
      )}

      <Drawer.Root
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white outline-none">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
            <div className="mx-auto max-w-lg p-4 pb-8">
              <Drawer.Title className="mb-3 font-bold text-gray-900">
                Sửa người chơi
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Chỉnh sửa tên, giới tính và giờ chơi
              </Drawer.Description>
              {editingPlayer && (
                <div className="flex flex-col gap-2">
                  <div>
                    <input
                      aria-label={`Tên của ${editingPlayer.name}`}
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditError("");
                      }}
                      onBlur={() => commitRename(editingPlayer)}
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
                      aria-pressed={editingPlayer.gender === "male"}
                      aria-label={`Đặt Nam cho ${editingPlayer.name}`}
                      onClick={() => onChangeGender(editingPlayer.id, "male")}
                      className={`relative h-11 flex-1 text-sm font-semibold ${
                        editingPlayer.gender === "male"
                          ? "text-white"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      {editingPlayer.gender === "male" && (
                        <motion.div
                          layoutId="gender-edit-pill"
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
                      aria-pressed={editingPlayer.gender === "female"}
                      aria-label={`Đặt Nữ cho ${editingPlayer.name}`}
                      onClick={() => onChangeGender(editingPlayer.id, "female")}
                      className={`relative h-11 flex-1 text-sm font-semibold ${
                        editingPlayer.gender === "female"
                          ? "text-white"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      {editingPlayer.gender === "female" && (
                        <motion.div
                          layoutId="gender-edit-pill"
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
                  {input.mode === "hourly" && (
                    <div className="flex items-center gap-2">
                      <TimeSelect
                        nested
                        aria-label={`Giờ vào của ${editingPlayer.name}`}
                        value={editingPlayer.startTime ?? input.courtStart}
                        onChange={(v) =>
                          updatePlayer(editingPlayer.id, {
                            startTime: v,
                            endTime: editingPlayer.endTime ?? input.courtEnd
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-gray-400">→</span>
                      <TimeSelect
                        nested
                        aria-label={`Giờ ra của ${editingPlayer.name}`}
                        value={editingPlayer.endTime ?? input.courtEnd}
                        onChange={(v) =>
                          updatePlayer(editingPlayer.id, {
                            endTime: v,
                            startTime:
                              editingPlayer.startTime ?? input.courtStart
                          })
                        }
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updatePlayer(editingPlayer.id, {
                            startTime: null,
                            endTime: null
                          })
                        }
                        className="h-11 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold whitespace-nowrap text-emerald-700"
                      >
                        Cả buổi
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={closeEdit}
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
    </section>
  );
}
