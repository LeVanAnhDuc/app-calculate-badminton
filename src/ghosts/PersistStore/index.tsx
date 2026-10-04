// libs
import { useEffect, useRef } from "react";
import { toast } from "sonner";
// hooks
import { useAppStore } from "@/hooks";
// others
import {
  loadSettings,
  saveCurrentSession,
  saveHistory,
  saveRoster,
  saveSettings
} from "@/libs/storage";

/**
 * Ghost — renders nothing, mirrors the store into localStorage on every
 * change. Lives in the root layout so it keeps running whichever page is open.
 */
const PersistStore = () => {
  const session = useAppStore((s) => s.session);
  const roster = useAppStore((s) => s.roster);
  const history = useAppStore((s) => s.history);
  const historySaveOkRef = useRef(true);

  useEffect(() => {
    saveCurrentSession(session);
    // Tên & giá cầu được nhớ từ DÒNG ĐẦU TIÊN; buổi không có dòng nào thì giữ giá trị cũ.
    const first = session.shuttles[0];
    saveSettings({
      ...loadSettings(),
      mode: session.mode,
      maleRatio: session.maleRatio,
      femaleRatio: session.femaleRatio,
      rounding: session.rounding,
      ...(first ? { shuttlePrice: first.price, shuttleName: first.name } : {})
    });
  }, [session]);

  useEffect(() => {
    saveRoster(roster);
  }, [roster]);

  useEffect(() => {
    const ok = saveHistory(history);
    if (!ok && historySaveOkRef.current) {
      toast.error("Không lưu được lịch sử — bộ nhớ trình duyệt đầy");
    }
    historySaveOkRef.current = ok;
  }, [history]);

  return null;
};

export default PersistStore;
