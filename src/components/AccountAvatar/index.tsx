// libs
import { useState } from "react";
// types
import type { DuckerProfile } from "@/types/Auth";
// others
import { initials } from "@/utils/initials";

/**
 * Ảnh đại diện Ducker ID, hoặc chữ cái đầu khi không có ảnh / ảnh lỗi.
 * Kích thước, màu nền và cỡ chữ do nơi dùng truyền qua `className` — cùng một
 * avatar hiện 44px trên header mobile, 32px trong chip desktop, 64px ở /account.
 */
const AccountAvatar = ({
  profile,
  className
}: {
  profile: DuckerProfile;
  className: string;
}) => {
  const [broken, setBroken] = useState(false);
  const label = profile.name ?? profile.email ?? "?";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${className}`}
      aria-hidden="true"
    >
      {profile.picture && !broken ? (
        <img
          src={profile.picture}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(label)
      )}
    </span>
  );
};

export default AccountAvatar;
