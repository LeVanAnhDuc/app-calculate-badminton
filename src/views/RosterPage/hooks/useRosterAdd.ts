// libs
import { useState } from "react";
// types
import type { Dispatch, SetStateAction } from "react";
import type { Gender } from "@/types/Session";
import type { RosterEntry } from "@/types/Storage";

const useRosterAdd = ({
  roster,
  onChange,
  onAdded
}: {
  roster: RosterEntry[];
  onChange: Dispatch<SetStateAction<RosterEntry[]>>;
  onAdded: () => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  // deliberately not reset by openAdd: the last gender picked is the likely next one
  const [addGender, setAddGender] = useState<Gender>("male");
  const [addError, setAddError] = useState("");

  const openAdd = () => {
    setAddName("");
    setAddError("");
    setAdding(true);
  };

  const changeAddName = (name: string) => {
    setAddName(name);
    setAddError("");
  };

  const addEntry = () => {
    const trimmed = addName.trim();
    if (!trimmed) return;
    const isDuplicate = roster.some(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setAddError(`"${trimmed}" đã có trong danh bạ`);
      return;
    }
    setAddError("");
    setAddName("");
    setAdding(false);
    onAdded();
    onChange([...roster, { name: trimmed, gender: addGender }]);
  };

  return {
    adding,
    setAdding,
    addName,
    addGender,
    setAddGender,
    addError,
    openAdd,
    changeAddName,
    addEntry
  };
};

export default useRosterAdd;
