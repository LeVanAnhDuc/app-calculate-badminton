// libs
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
// types
import type { CollectorAccount } from "@/types/Storage";
// components
import { ShareIcon } from "@/components/Icons";
import QRImage from "@/components/QRImage";
import CollectorAccountForm from "@/components/CollectorAccountForm";
// others
import { findBank } from "@/utils/banks";
import { formatVND } from "@/utils/format";
import { sharePlayerQR } from "@/libs/qrCard";
import { loadCollectorAccount } from "@/libs/storage";
import { buildMemo, buildVietQRPayload } from "@/utils/vietqr";

/**
 * Bottom sheet hiển thị mã VietQR cho một người chơi. Lần đầu (chưa có tài
 * khoản người thu) hiện form thiết lập ngay trong sheet; sau đó hiện QR +
 * nút "Đã trả" để khép kín vòng chia tiền → quét → tick.
 */
const QRSheet = ({
  open,
  onClose,
  playerName,
  amount,
  memoDate,
  paid,
  onTogglePaid
}: {
  open: boolean;
  onClose: () => void;
  playerName: string;
  amount: number;
  memoDate: Date;
  paid: boolean;
  onTogglePaid: () => void;
}) => {
  const [account, setAccount] = useState<CollectorAccount | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (open) {
      const a = loadCollectorAccount();
      setAccount(a);
      setEditing(a === null);
    }
  }, [open]);

  const memo = buildMemo(memoDate, playerName);
  const bank = account ? findBank(account.bankBin) : undefined;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o: boolean) => {
        if (!o) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
          <div className="mx-auto max-w-lg p-4 pb-6">
            <Drawer.Title className="mb-1 text-center font-bold text-gray-900">
              {editing ? "Tài khoản nhận tiền" : `Quét để trả — ${playerName}`}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Mã VietQR để chuyển khoản tiền cầu lông
            </Drawer.Description>

            {editing || account === null ? (
              <CollectorAccountForm
                initial={account}
                onSaved={(a) => {
                  setAccount(a);
                  setEditing(false);
                }}
              />
            ) : (
              <div className="flex flex-col items-center">
                <QRImage
                  payload={buildVietQRPayload({
                    bankBin: account.bankBin,
                    accountNo: account.accountNo,
                    amount,
                    memo
                  })}
                  label={`Mã VietQR cho ${playerName}`}
                />
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {formatVND(amount)}
                </p>
                <p className="text-sm text-gray-500">{memo}</p>
                {/* one template string → one DOM text node, so getByText(regex) matches */}
                <p className="mt-2 text-xs text-gray-400">
                  {`Chuyển tới: ${bank?.shortName ?? account.bankBin} · ${account.accountNo}${
                    account.accountName ? ` · ${account.accountName}` : ""
                  }`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePaid();
                    onClose();
                  }}
                  className={`mt-4 h-12 w-full rounded-xl font-bold ${
                    paid
                      ? "border border-gray-300 text-gray-600"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {paid ? "Bỏ đánh dấu đã trả" : "✓ Đã trả"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // sheet vẫn mở và không tự tick "đã trả": gửi QR ≠ đã nhận tiền
                    const outcome = await sharePlayerQR({
                      playerName,
                      amount,
                      memoDate,
                      account
                    });
                    // 'shared'/'cancelled' đã được share sheet của máy phản hồi rồi
                    if (outcome === "downloaded")
                      toast.success(`Đã tải ảnh QR của ${playerName}`);
                  }}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 font-bold text-emerald-700"
                >
                  <ShareIcon /> Chia sẻ QR
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm text-gray-400 underline"
                >
                  Sửa tài khoản
                </button>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default QRSheet;
