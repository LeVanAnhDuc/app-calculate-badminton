// libs
import { useState } from "react";
// components
import EyeButton from "@/components/EyeButton";

const HiddenAmountRow = ({
  label,
  text,
  valueClassName,
  shownLabel,
  hiddenLabel
}: {
  label: string;
  text: string;
  valueClassName: string;
  shownLabel: string;
  hiddenLabel: string;
}) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1">
        <span className={`font-semibold tracking-wider ${valueClassName}`}>
          {shown ? text : "•••••"}
        </span>
        <EyeButton
          shown={shown}
          onToggle={() => setShown(!shown)}
          shownLabel={shownLabel}
          hiddenLabel={hiddenLabel}
        />
      </span>
    </div>
  );
};

export default HiddenAmountRow;
