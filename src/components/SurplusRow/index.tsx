// components
import HiddenAmountRow from "@/components/HiddenAmountRow";
// others
import { formatVND } from "@/utils/format";

const SurplusRow = ({ surplus }: { surplus: number }) => {
  const sign = surplus >= 0 ? "+" : "−";
  const colorClass = surplus >= 0 ? "text-emerald-600" : "text-red-500";
  return (
    <HiddenAmountRow
      label="Số dư (để dành mua cầu)"
      text={`${sign}${formatVND(Math.abs(surplus))}`}
      valueClassName={colorClass}
      shownLabel="Ẩn số dư"
      hiddenLabel="Hiện số dư"
    />
  );
};

export default SurplusRow;
