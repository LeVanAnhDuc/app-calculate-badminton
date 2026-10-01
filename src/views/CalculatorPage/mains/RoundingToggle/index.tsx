// libs
import { motion } from "motion/react";
// types
import type { Rounding } from "@/types/Session";

const LABELS: Record<Rounding, string> = {
  up1000: "Làm tròn lên 1.000đ",
  exact: "Giữ chính xác"
};

const RoundingToggle = ({
  rounding,
  onChange
}: {
  rounding: Rounding;
  onChange: (r: Rounding) => void;
}) => {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-gray-900">Làm tròn</h2>
      <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        {(Object.keys(LABELS) as Rounding[]).map((r) => {
          const active = r === rounding;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(r)}
              className={`relative h-11 rounded-lg text-sm font-semibold ${
                active ? "text-white" : "text-gray-500"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="rounding-pill"
                  className="absolute inset-0 rounded-lg bg-emerald-600"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                />
              )}
              <span className="relative z-10">{LABELS[r]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default RoundingToggle;
