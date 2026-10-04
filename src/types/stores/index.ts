// types
import type { SetStateAction } from "react";
import type { Gender, SessionInput } from "@/types/Session";
import type { RosterEntry, SavedSession } from "@/types/Storage";

export interface SessionSlice {
  session: SessionInput;
  patchSession: (patch: Partial<SessionInput>) => void;
  addPlayer: (name: string, gender: Gender) => void;
  changeGender: (playerId: string, gender: Gender) => void;
  renamePlayer: (playerId: string, newName: string) => void;
  removePlayer: (playerId: string) => void;
  newSession: () => void;
  /** Returns false when there is nothing valid to save. */
  saveSession: () => boolean;
}

export interface RosterSlice {
  roster: RosterEntry[];
  setRoster: (next: SetStateAction<RosterEntry[]>) => void;
}

export interface HistorySlice {
  history: SavedSession[];
  deleteSavedSession: (id: string) => void;
  togglePaid: (sessionId: string, playerId: string) => void;
  reuseSession: (saved: SavedSession) => void;
}

export type AppStore = SessionSlice & RosterSlice & HistorySlice;
