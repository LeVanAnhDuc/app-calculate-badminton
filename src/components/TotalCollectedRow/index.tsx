// components
import HiddenAmountRow from "@/components/HiddenAmountRow";
// others
import { formatVND } from "@/utils/format";

const TotalCollectedRow = ({ total }: { total: number }) => {
  return (
    <HiddenAmountRow
      label="Tổng thu"
      text={formatVND(total)}
      valueClassName="text-gray-900"
      shownLabel="Ẩn tổng thu"
      hiddenLabel="Hiện tổng thu"
    />
  );
};

export default TotalCollectedRow;
