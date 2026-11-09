"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface ProfileAvatarProps {
  userId?: string | null;
  avatarPath?: string | null;
  name: string;
  size: number;
  className?: string;
}

export function ProfileAvatar({
  userId,
  avatarPath,
  name,
  size,
  className = "",
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const validPath = Boolean(
    userId && avatarPath?.startsWith(`avatars/${userId}/`)
  );

  useEffect(() => {
    setImageFailed(false);
  }, [avatarPath]);

  const imageUrl = validPath && !imageFailed
    ? `/api/profiles/${userId}/avatar?v=${encodeURIComponent(avatarPath ?? "")}`
    : null;

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#664d83] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      role="img"
      aria-label={`${name} profile picture`}
    >
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
  );
}
