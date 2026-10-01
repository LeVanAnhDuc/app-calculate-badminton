// components
import RatioField from "../../components/RatioField";

const RatioInputs = ({
  maleRatio,
  femaleRatio,
  note,
  onChange
}: {
  maleRatio: number;
  femaleRatio: number;
  note?: string;
  onChange: (p: { maleRatio?: number; femaleRatio?: number }) => void;
}) => {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-gray-900">Hệ số nam / nữ</h2>
      {note && <p className="mb-3 text-xs text-gray-400">{note}</p>}
      <div className="mt-2 flex gap-3">
        <RatioField
          id="ratio-male"
          label="Nam"
          value={maleRatio}
          onChange={(v) => onChange({ maleRatio: v })}
        />
        <RatioField
          id="ratio-female"
          label="Nữ"
          value={femaleRatio}
          onChange={(v) => onChange({ femaleRatio: v })}
        />
      </div>
    </section>
  );
};

export default RatioInputs;
