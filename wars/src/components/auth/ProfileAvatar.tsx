"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useId, useState } from "react";
import { getProfileFrame } from "@/lib/profile-frames/catalog";

interface ProfileAvatarProps {
  userId?: string | null;
  avatarPath?: string | null;
  previewSrc?: string | null;
  name: string;
  role?: string | null;
  frameId?: string | null;
  size: number;
  className?: string;
}

export function ProfileAvatar({
  userId,
  avatarPath,
  previewSrc,
  name,
  role,
  frameId,
  size,
  className = "",
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const instanceId = useId().replace(/:/g, "");
  const validPath = Boolean(
    userId && avatarPath?.startsWith(`avatars/${userId}/`)
  );
  const normalizedRole = role?.trim().toLowerCase();
  const storeFrame = getProfileFrame(frameId);
  const frameClass = storeFrame
    ? `profile-avatar-frame--${storeFrame.id}`
    : normalizedRole === "owner"
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

  const frameStyle: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(10, size * 0.32),
  };

  return (
    <div
      className={`profile-avatar-frame relative grid shrink-0 place-items-center rounded-full font-bold text-white ${frameClass} ${className}`}
      style={frameStyle}
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
      {storeFrame?.id === "crunching-fang" && (
        <svg className="profile-avatar-fang__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id={`${instanceId}-fang-silver`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.45" stopColor="#cbd5e1" />
              <stop offset="1" stopColor="#64748b" />
            </linearGradient>
            <filter id={`${instanceId}-fang-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.9" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="profile-avatar-fang__top" filter={`url(#${instanceId}-fang-glow)`}>
            <path d="M8 5 Q50 -4 92 5 L89 24 L81 14 L74 35 L67 14 L59 38 L51 13 L44 36 L36 13 L29 35 L21 14 L14 25 Z" fill={`url(#${instanceId}-fang-silver)`} stroke="#fff" strokeWidth="1.4" />
          </g>
          <g className="profile-avatar-fang__bottom" filter={`url(#${instanceId}-fang-glow)`}>
            <path d="M8 95 Q50 104 92 95 L89 76 L81 86 L74 65 L67 86 L59 62 L51 87 L44 64 L36 87 L29 65 L21 86 L14 75 Z" fill={`url(#${instanceId}-fang-silver)`} stroke="#fff" strokeWidth="1.4" />
          </g>
        </svg>
      )}
    </div>
  );
}
