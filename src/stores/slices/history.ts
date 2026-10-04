// types
import type { StateCreator } from "zustand";
import type { AppStore, HistorySlice } from "@/types/stores";
// others
import { uid } from "@/utils/uid";
import { insertAt, toastUndo } from "@/libs/undo";
import { loadHistory } from "@/libs/storage";

const createHistorySlice: StateCreator<AppStore, [], [], HistorySlice> = (
  set,
  get
) => ({
  history: loadHistory(),

  deleteSavedSession: (id) => {
    const { history } = get();
    const index = history.findIndex((s) => s.id === id);
    if (index === -1) return;
    const removed = history[index];
    set((state) => ({ history: state.history.filter((s) => s.id !== id) }));
    toastUndo("Đã xóa buổi này", () =>
      set((state) => ({ history: insertAt(state.history, index, removed) }))
    );
  },

  togglePaid: (sessionId, playerId) =>
    set((state) => ({
      history: state.history.map((s) =>
        s.id !== sessionId
          ? s
          : {
              ...s,
              input: {
                ...s.input,
                players: s.input.players.map((p) =>
                  p.id === playerId ? { ...p, paid: !p.paid } : p
                )
              }
            }
      )
    })),

  reuseSession: (saved) =>
    set((state) => ({
      session: {
        ...state.session,
        players: saved.input.players.map((p) => ({
          id: uid(),
          name: p.name,
          gender: p.gender,
          halfSession: false,
          startTime: null,
          endTime: null,
          paid: false
        })),
        // every player gets a fresh id, so old extras could not be
        // re-pointed at anyone — the new session starts clean
        extras: []
      }
    }))
});

export default createHistorySlice;
