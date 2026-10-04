// libs
import { useState } from "react";
// types
import type { Dispatch, SetStateAction } from "react";
import type { Gender } from "@/types/Session";
import type { RosterEntry } from "@/types/Storage";

const useRosterEdit = ({
  roster,
  onChange
}: {
  roster: RosterEntry[];
  onChange: Dispatch<SetStateAction<RosterEntry[]>>;
}) => {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  const editingEntry = roster.find((r) => r.name === editingName) ?? null;

  const openEdit = (entry: RosterEntry) => {
    setEditingName(entry.name);
    setEditName(entry.name);
    setEditError("");
  };

  const changeEditName = (name: string) => {
    setEditName(name);
    setEditError("");
  };

  const commitRename = () => {
    if (!editingEntry) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(editingEntry.name);
      setEditError("");
      return;
    }
    const isDuplicate = roster.some(
      (r) =>
        r !== editingEntry && r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(`"${trimmed}" đã có trong danh bạ`);
      return;
    }
    setEditError("");
    if (trimmed !== editingEntry.name) {
      onChange(
        roster.map((r) => (r === editingEntry ? { ...r, name: trimmed } : r))
      );
      setEditingName(trimmed);
    }
  };

  const changeEditingGender = (gender: Gender) => {
    if (!editingEntry) return;
    onChange(roster.map((r) => (r === editingEntry ? { ...r, gender } : r)));
  };

  const closeEdit = () => {
    commitRename();
    setEditingName(null);
  };

  return {
    isOpen: editingName !== null,
    editingEntry,
    editName,
    editError,
    openEdit,
    changeEditName,
    commitRename,
    changeEditingGender,
    closeEdit
  };
};

export default useRosterEdit;
