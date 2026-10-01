// libs
import { toast } from "sonner";
// types
import type { ShareButtonProps } from "@/types/Share";
// components
import { ShareIcon } from "@/components/Icons";
// others
import { shareResultImage } from "@/libs/shareResult";
import { ICON_CLASS, WIDE_CLASS } from "@/constants/shareButtons";

const ShareImageButton = ({
  result,
  mode,
  players,
  date,
  variant = "icon"
}: ShareButtonProps) => {
  const handleShare = async () => {
    const outcome = await shareResultImage(result, mode, players, date);
    // 'shared'/'cancelled' get their feedback from the OS share sheet itself
    if (outcome === "downloaded") toast.success("Đã tải ảnh kết quả");
  };
  if (variant === "wide") {
    return (
      <button type="button" onClick={handleShare} className={WIDE_CLASS}>
        <ShareIcon /> Chia sẻ ảnh
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Chia sẻ ảnh kết quả"
      title="Chia sẻ ảnh kết quả"
      onClick={handleShare}
      className={ICON_CLASS}
    >
      <ShareIcon />
    </button>
  );
};

export default ShareImageButton;
