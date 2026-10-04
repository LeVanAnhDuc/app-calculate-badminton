// libs
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a VietQR payload as an <img> (data URL, generated at 2× for sharpness). */
const QRImage = ({
  payload,
  size = 280,
  label
}: {
  payload: string;
  size?: number; // CSS px
  label: string; // alt text
}) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: size * 2
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gray-100"
        aria-hidden
      />
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label}
      className="rounded-xl"
    />
  );
};

export default QRImage;
