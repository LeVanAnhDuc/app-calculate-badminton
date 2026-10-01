// libs
import { createStore } from "zustand";
// types
import type { AppStore } from "@/types/stores";
// others
import createHistorySlice from "./slices/history";
import createRosterSlice from "./slices/roster";
import createSessionSlice from "./slices/session";

/**
 * A factory, not a module-level store: each mount of <App/> builds its own
 * store from localStorage, exactly like the useState initialisers it
 * replaces. A singleton would carry state across tests and remounts.
 */
export const createAppStore = () =>
  createStore<AppStore>()((...a) => ({
    ...createSessionSlice(...a),
    ...createRosterSlice(...a),
    ...createHistorySlice(...a)
  }));

export type AppStoreApi = ReturnType<typeof createAppStore>;
