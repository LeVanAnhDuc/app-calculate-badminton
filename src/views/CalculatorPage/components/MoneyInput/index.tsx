// libs
import { useLayoutEffect, useRef, useState } from "react";
// types
import type { ChangeEvent } from "react";
// others
import {
  formatNumber,
  parseMoney,
  caretPositionForDigitCount
} from "@/utils/format";

const MoneyInput = ({
  value,
  onChange,
  className = "",
  id,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);
  const display = value === 0 ? "" : formatNumber(value);

  useLayoutEffect(() => {
    if (pendingCaret !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret, pendingCaret);
      setPendingCaret(null);
    }
  }, [display, pendingCaret]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const caretPos = e.target.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue
      .slice(0, caretPos)
      .replace(/\D/g, "").length;
    const newValue = parseMoney(rawValue);
    const newDisplay = newValue === 0 ? "" : formatNumber(newValue);
    setPendingCaret(caretPositionForDigitCount(newDisplay, digitsBeforeCaret));
    onChange(newValue);
  };

  return (
    <input
      ref={inputRef}
      id={id}
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder="0"
      className={`h-12 rounded-xl border border-gray-300 px-3 text-right text-lg font-semibold text-gray-900 ${className}`}
      {...rest}
    />
  );
};

export default MoneyInput;
