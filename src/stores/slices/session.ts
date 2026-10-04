// types
import type { StateCreator } from "zustand";
import type { ExtraCost, Player, SessionInput } from "@/types/Session";
import type { Settings } from "@/types/Storage";
import type { AppStore, SessionSlice } from "@/types/stores";
// others
import { calcSession, validateSession } from "@/utils/calc";
import { uid } from "@/utils/uid";
import { insertAt, toastUndo } from "@/libs/undo";
import {
  addToRoster,
  HISTORY_LIMIT,
  loadCurrentSession,
  loadSettings
} from "@/libs/storage";

export function defaultSession(s: Settings): SessionInput {
  return {
    mode: s.mode,
    shuttles: [
      { id: uid(), name: s.shuttleName, count: 0, price: s.shuttlePrice }
    ],
    courtFee: 0,
    courtStart: "19:00",
    courtEnd: "21:00",
    maleRatio: s.maleRatio,
    femaleRatio: s.femaleRatio,
    rounding: s.rounding,
    players: [],
    extras: []
  };
}

const createSessionSlice: StateCreator<AppStore, [], [], SessionSlice> = (
  set,
  get
) => ({
  session: loadCurrentSession() ?? defaultSession(loadSettings()),

  patchSession: (patch) =>
    set((state) => ({ session: { ...state.session, ...patch } })),

  addPlayer: (name, gender) => {
    const player: Player = {
      id: uid(),
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
      paid: false
    };
    set((state) => ({
      session: {
        ...state.session,
        players: [...state.session.players, player]
      },
      roster: addToRoster(state.roster, name, gender)
    }));
  },

  changeGender: (playerId, gender) => {
    const player = get().session.players.find((p) => p.id === playerId);
    if (!player) return;
    set((state) => ({
      session: {
        ...state.session,
        players: state.session.players.map((p) =>
          p.id === playerId ? { ...p, gender } : p
        )
      },
      roster: addToRoster(state.roster, player.name, gender)
    }));
  },

  renamePlayer: (playerId, newName) => {
    const player = get().session.players.find((p) => p.id === playerId);
    if (!player) return;
    set((state) => ({
      session: {
        ...state.session,
        players: state.session.players.map((p) =>
          p.id === playerId ? { ...p, name: newName } : p
        )
      },
      roster: addToRoster(state.roster, newName, player.gender)
    }));
  },

  // Deletes are undoable rather than confirmed up front. The undo callbacks
  // always go through the functional updater form so that anything changed
  // while the toast is on screen survives — undo re-inserts the one removed
  // item, it never restores a stale snapshot of the whole list.
  removePlayer: (playerId) => {
    const { session } = get();
    const index = session.players.findIndex((p) => p.id === playerId);
    if (index === -1) return;
    const removed = session.players[index];

    // A shared extra keeps its full amount when one of its bearers leaves — the
    // remaining bearers cover that share, so TỔNG CHI does not move. An extra
    // nobody is left to bear is dropped entirely: it would still inflate
    // totalCost with nobody paying for it.
    //
    // Snapshot BEFORE updating: the extras dropped outright (with their old
    // index) and the ids of the extras merely trimmed by one bearer.
    const dropped: { index: number; item: ExtraCost }[] = [];
    const trimmedIds: string[] = [];
    session.extras.forEach((e, i) => {
      if (!e.playerIds.includes(playerId)) return;
      if (e.playerIds.length === 1) dropped.push({ index: i, item: e });
      else trimmedIds.push(e.id);
    });

    set((state) => ({
      session: {
        ...state.session,
        players: state.session.players.filter((p) => p.id !== playerId),
        extras: state.session.extras
          .map((e) =>
            e.playerIds.includes(playerId)
              ? { ...e, playerIds: e.playerIds.filter((id) => id !== playerId) }
              : e
          )
          .filter((e) => e.playerIds.length > 0)
      }
    }));

    toastUndo(`Đã xóa "${removed.name}"`, () =>
      set((state) => {
        const s = state.session;
        // (a) put the id back into the extras that were only trimmed — an extra
        //     the user deleted by hand meanwhile is skipped by map(), NOT revived
        let extras = s.extras.map((e) =>
          trimmedIds.includes(e.id) && !e.playerIds.includes(playerId)
            ? { ...e, playerIds: [...e.playerIds, playerId] }
            : e
        );
        // (b) put the dropped extras back at their old index; ascending order
        //     (forEach above already produced it) keeps the inserts from
        //     shifting each other
        for (const d of dropped) extras = insertAt(extras, d.index, d.item);
        // (c) put the player back at their old index
        return {
          session: {
            ...s,
            players: insertAt(s.players, index, removed),
            extras
          }
        };
      })
    );
  },

  newSession: () => {
    const previous = get().session;
    set({ session: defaultSession(loadSettings()) });
    // Nothing was entered yet — there is nothing worth offering to undo.
    const isEmpty =
      previous.players.length === 0 &&
      previous.courtFee === 0 &&
      previous.shuttles.every((l) => l.count === 0) &&
      previous.extras.length === 0;
    if (isEmpty) return;
    // The only site that restores a whole snapshot: a reset has no single
    // removed element to put back.
    toastUndo("Đã bắt đầu buổi mới", () => set({ session: previous }));
  },

  saveSession: () => {
    const { session } = get();
    if (validateSession(session).length > 0) return false;
    const result = calcSession(session);
    const isFiniteResult =
      Number.isFinite(result.surplus) &&
      result.players.every((p) => Number.isFinite(p.amount));
    if (!isFiniteResult) return false;
    set((state) => ({
      history: [
        {
          id: uid(),
          savedAt: new Date().toISOString(),
          input: session,
          result
        },
        ...state.history
      ].slice(0, HISTORY_LIMIT),
      roster: session.players.reduce(
        (acc, p) => addToRoster(acc, p.name, p.gender),
        state.roster
      )
    }));
    return true;
  }
});

export default createSessionSlice;
