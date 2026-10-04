// libs
import { useState } from "react";
// types
import type { CollectorAccount } from "@/types/Storage";
// others
import { ACCOUNT_NO_RE, BANKS } from "@/constants/banks";
import { findBank } from "@/utils/banks";
import { saveCollectorAccount } from "@/libs/storage";

const CollectorAccountForm = ({
  initial,
  onSaved
}: {
  initial: CollectorAccount | null;
  onSaved: (a: CollectorAccount) => void;
}) => {
  const [bankQuery, setBankQuery] = useState("");
  const [bankBin, setBankBin] = useState(initial?.bankBin ?? "");
  const [accountNo, setAccountNo] = useState(initial?.accountNo ?? "");
  const [accountName, setAccountName] = useState(initial?.accountName ?? "");

  const selectedBank = findBank(bankBin);
  const q = bankQuery.trim().toLowerCase();
  const filtered = q
    ? BANKS.filter((b) => `${b.shortName} ${b.name}`.toLowerCase().includes(q))
    : BANKS;
  const valid = selectedBank !== undefined && ACCOUNT_NO_RE.test(accountNo);

  const submit = () => {
    if (!valid) return;
    const account: CollectorAccount = {
      bankBin,
      accountNo,
      accountName: accountName.trim().toUpperCase()
    };
    saveCollectorAccount(account);
    onSaved(account);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Nhập tài khoản nhận tiền một lần — app sẽ dùng cho mọi buổi sau.
      </p>
      {selectedBank ? (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
          <span className="font-semibold text-gray-900">
            {selectedBank.shortName}
          </span>
          <button
            type="button"
            className="text-sm font-semibold text-emerald-700"
            onClick={() => setBankBin("")}
          >
            Đổi
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Tìm ngân hàng"
            value={bankQuery}
            onChange={(e) => setBankQuery(e.target.value)}
            className="h-12 w-full rounded-xl border border-gray-300 px-3"
          />
          <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
            {filtered.map((b) => (
              <li key={b.bin}>
                <button
                  type="button"
                  onClick={() => setBankBin(b.bin)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">
                    {b.shortName}
                  </span>{" "}
                  <span className="text-xs text-gray-400">{b.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-gray-400">
                Không tìm thấy ngân hàng
              </li>
            )}
          </ul>
        </>
      )}
      <input
        type="text"
        inputMode="numeric"
        placeholder="Số tài khoản"
        value={accountNo}
        onChange={(e) => setAccountNo(e.target.value.trim())}
        className="h-12 w-full rounded-xl border border-gray-300 px-3"
      />
      <input
        type="text"
        placeholder="Tên chủ tài khoản (không bắt buộc)"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        className="h-12 w-full rounded-xl border border-gray-300 px-3"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={submit}
        className="h-12 w-full rounded-xl bg-emerald-600 font-bold text-white disabled:bg-gray-300"
      >
        Lưu tài khoản
      </button>
    </div>
  );
};

export default CollectorAccountForm;
