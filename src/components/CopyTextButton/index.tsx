// libs
import { toast } from "sonner";
// types
import type { ShareButtonProps } from "@/types/Share";
// components
import { CopyIcon } from "@/components/Icons";
// others
import { copyResultText } from "@/libs/shareResult";
import { ICON_CLASS, WIDE_CLASS } from "@/constants/shareButtons";

const CopyTextButton = ({
  result,
  mode,
  players,
  date,
  variant = "icon"
}: ShareButtonProps) => {
  const handleCopy = async () => {
    const ok = await copyResultText(result, mode, players, date);
    if (ok) toast.success("Đã copy kết quả ✓");
    else toast.error("Không copy được kết quả");
  };
  if (variant === "wide") {
    return (
      <button type="button" onClick={handleCopy} className={WIDE_CLASS}>
        <CopyIcon /> Copy kết quả
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Copy kết quả"
      title="Copy kết quả"
      onClick={handleCopy}
      className={ICON_CLASS}
    >
      <CopyIcon />
    </button>
  );
};

export default CopyTextButton;
