// libs
import { useState } from "react";
// types
import type { Dispatch, SetStateAction } from "react";
import type { RosterEntry } from "@/types/Storage";
// components
import RosterAddSheet from "./mains/RosterAddSheet";
import RosterEditSheet from "./mains/RosterEditSheet";
import RosterHeader from "./mains/RosterHeader";
import RosterList from "./mains/RosterList";
// hooks
import useRosterAdd from "./hooks/useRosterAdd";
import useRosterEdit from "./hooks/useRosterEdit";
// others
import { insertAt, toastUndo } from "@/libs/undo";

const RosterPage = ({
  roster,
  onBack,
  onChange
}: {
  roster: RosterEntry[];
  onBack: () => void;
  // takes an updater too, so undoing a delete re-inserts into the roster as
  // it is at that moment rather than a snapshot from before the toast
  onChange: Dispatch<SetStateAction<RosterEntry[]>>;
}) => {
  const [query, setQuery] = useState("");
  const [openSwipeName, setOpenSwipeName] = useState<string | null>(null);

  const add = useRosterAdd({
    roster,
    onChange,
    // a name hidden by the current search would look like nothing happened
    onAdded: () => setQuery("")
  });
  const edit = useRosterEdit({ roster, onChange });

  const requestDelete = (name: string) => {
    const index = roster.findIndex((r) => r.name === name);
    if (index === -1) return;
    const removed = roster[index];
    setOpenSwipeName(null);
    onChange((r) => r.filter((entry) => entry.name !== name));
    toastUndo(`Đã xóa "${name}" khỏi danh bạ`, () =>
      onChange((r) => insertAt(r, index, removed))
    );
  };

  const openEdit = (entry: RosterEntry) => {
    setOpenSwipeName(null);
    edit.openEdit(entry);
  };

  return (
    <div className="flex min-h-dvh justify-center bg-gray-100">
      {/* pb gộp 2rem + safe-area: hai utility padding-bottom trên cùng element
          sẽ đè nhau theo thứ tự CSS nên gộp thành một class */}
      <div className="min-h-dvh w-full max-w-[430px] bg-[#F2F2F7] pb-[calc(2rem+env(safe-area-inset-bottom))] md:max-w-2xl">
        <RosterHeader
          count={roster.length}
          query={query}
          onQueryChange={setQuery}
          onAdd={add.openAdd}
          onBack={onBack}
        />
        <RosterList
          roster={roster}
          query={query}
          openSwipeName={openSwipeName}
          onOpenSwipeChange={setOpenSwipeName}
          onEdit={openEdit}
          onDelete={requestDelete}
        />
      </div>
      <RosterAddSheet
        open={add.adding}
        onOpenChange={add.setAdding}
        addName={add.addName}
        addGender={add.addGender}
        addError={add.addError}
        onNameChange={add.changeAddName}
        onGenderChange={add.setAddGender}
        onAdd={add.addEntry}
      />
      <RosterEditSheet
        open={edit.isOpen}
        editingEntry={edit.editingEntry}
        editName={edit.editName}
        editError={edit.editError}
        onNameChange={edit.changeEditName}
        onCommitRename={edit.commitRename}
        onGenderChange={edit.changeEditingGender}
        onClose={edit.closeEdit}
      />
    </div>
  );
};

export default RosterPage;
