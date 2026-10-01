import { motion } from "motion/react";
import type { Mode } from "../lib/types";

const LABELS: Record<Mode, string> = {
  ratio: "Chia theo tỉ lệ",
  hourly: "Sân theo giờ"
};

export function ModeSwitch({
  mode,
  onChange
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
      {(Object.keys(LABELS) as Mode[]).map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m)}
            className={`relative h-12 rounded-xl text-sm font-semibold ${
              active ? "text-white" : "text-gray-500"
            }`}
          >
            {active && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 rounded-xl bg-emerald-600"
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              />
            )}
            <span className="relative z-10">{LABELS[m]}</span>
          </button>
        );
      })}
    </div>
  );
}
