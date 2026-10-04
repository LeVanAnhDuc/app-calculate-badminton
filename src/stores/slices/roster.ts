// types
import type { StateCreator } from "zustand";
import type { AppStore, RosterSlice } from "@/types/stores";
// others
import { loadRoster } from "@/libs/storage";

const createRosterSlice: StateCreator<AppStore, [], [], RosterSlice> = (
  set
) => ({
  roster: loadRoster(),

  // accepts an updater like a useState setter, so RosterPage's undo
  // re-inserts into the roster as it is at that moment
  setRoster: (next) =>
    set((state) => ({
      roster: typeof next === "function" ? next(state.roster) : next
    }))
});

export default createRosterSlice;
