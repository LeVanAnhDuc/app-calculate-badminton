// libs
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
// components
import CalculatorPage from "@/views/CalculatorPage";
// hooks
import { useAppStore } from "@/hooks";
// others
import { ROUTES } from "@/constants/routes";
import { calcSession, validateSession } from "@/utils/calc";
import { frequentPlayers } from "@/utils/frequent";
import { frequentShuttleTypes } from "@/utils/shuttleTypes";

const CalculatorRoute = () => {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const roster = useAppStore((s) => s.roster);
  const history = useAppStore((s) => s.history);
  const patchSession = useAppStore((s) => s.patchSession);
  const addPlayer = useAppStore((s) => s.addPlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);
  const changeGender = useAppStore((s) => s.changeGender);
  const renamePlayer = useAppStore((s) => s.renamePlayer);
  const saveSession = useAppStore((s) => s.saveSession);
  const newSession = useAppStore((s) => s.newSession);

  // Tần suất suy ra từ lịch sử đã lưu (không lưu thêm trường nào vào danh bạ).
  const frequent = useMemo(
    () => frequentPlayers(history, roster, session.players),
    [history, roster, session.players]
  );
  // Lọc theo dòng cầu khác trong buổi do CostForm tự làm — route không cần biết.
  const shuttleTypes = useMemo(
    () => frequentShuttleTypes(history, []),
    [history]
  );

  const errors = validateSession(session);
  const result = errors.length === 0 ? calcSession(session) : null;

  const [saveDisabled, setSaveDisabled] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  const handleSave = () => {
    if (!saveSession()) return;
    toast.success("Đã lưu buổi ✓");
    setSaveDisabled(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveDisabled(false), 2500);
  };

  return (
    <CalculatorPage
      session={session}
      roster={roster}
      frequent={frequent}
      shuttleTypes={shuttleTypes}
      result={result}
      errors={errors}
      saveDisabled={saveDisabled}
      onPatch={patchSession}
      onAddPlayer={addPlayer}
      onRemovePlayer={removePlayer}
      onChangeGender={changeGender}
      onRenamePlayer={renamePlayer}
      onSave={handleSave}
      onNewSession={newSession}
      onOpenHistory={() => navigate(ROUTES.HISTORY)}
      onOpenRoster={() => navigate(ROUTES.ROSTER)}
      onOpenAccount={() => navigate(ROUTES.ACCOUNT)}
    />
  );
};

export default CalculatorRoute;
