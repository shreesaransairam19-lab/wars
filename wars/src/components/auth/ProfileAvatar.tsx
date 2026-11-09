"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface ProfileAvatarProps {
  userId?: string | null;
  avatarPath?: string | null;
  previewSrc?: string | null;
  name: string;
  role?: string | null;
  size: number;
  className?: string;
}

export function ProfileAvatar({
  userId,
  avatarPath,
  previewSrc,
  name,
  role,
  size,
  className = "",
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const validPath = Boolean(
    userId && avatarPath?.startsWith(`avatars/${userId}/`)
  );
  const normalizedRole = role?.trim().toLowerCase();
  const frameClass = normalizedRole === "owner"
    ? "profile-avatar-frame--owner"
    : normalizedRole === "donator"
      ? "profile-avatar-frame--donator"
      : "";

  useEffect(() => {
    setImageFailed(false);
  }, [avatarPath, previewSrc]);

  const imageUrl = !imageFailed && previewSrc
    ? previewSrc
    : validPath && !imageFailed
      ? `/api/profiles/${userId}/avatar?v=${encodeURIComponent(avatarPath ?? "")}`
      : null;

  return (
    <div
      className={`profile-avatar-frame relative grid shrink-0 place-items-center rounded-full font-bold text-white ${frameClass} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      role="img"
      aria-label={`${name} profile picture`}
    >
      <div className="profile-avatar-frame__portrait">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes={`${size}px`}
            unoptimized
            onError={() => setImageFailed(true)}
            className="object-cover"
          />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
      </div>
    </div>
  );
}
