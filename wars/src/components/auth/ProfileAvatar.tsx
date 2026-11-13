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
        : normalizedRole === "admin"
          ? "profile-avatar-frame--admin"
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
      {storeFrame?.id === "thunder-sparking" && (
        <svg className="profile-avatar-thunder__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id={`${instanceId}-thunder-bolt`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fffde7" />
              <stop offset="0.48" stopColor="#fde047" />
              <stop offset="1" stopColor="#eab308" />
            </linearGradient>
            <filter id={`${instanceId}-thunder-glow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feFlood floodColor="#facc15" floodOpacity="0.95" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g fill={`url(#${instanceId}-thunder-bolt)`} filter={`url(#${instanceId}-thunder-glow)`}>
            <path className="profile-avatar-thunder__bolt profile-avatar-thunder__bolt--one" d="M84 5 73 11 78 17 66 24 78 22 73 32 91 17 81 19 87 12Z" />
            <path className="profile-avatar-thunder__bolt profile-avatar-thunder__bolt--two" d="M14 68 25 62 20 57 33 50 21 52 26 41 8 56 18 55 12 62Z" />
            <path className="profile-avatar-thunder__bolt profile-avatar-thunder__bolt--three" d="M28 7 22 12 26 16 18 21 27 20 24 27 36 17 29 18 33 13Z" />
            <path className="profile-avatar-thunder__bolt profile-avatar-thunder__bolt--four" d="M79 76 72 81 76 85 68 90 77 89 74 96 86 86 79 87 83 82Z" />
          </g>
        </svg>
      )}
      {storeFrame?.id === "water-splash" && (
        <svg className="profile-avatar-water__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id={`${instanceId}-water-drop`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ecfeff" />
              <stop offset="0.5" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
            <filter id={`${instanceId}-water-glow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#22d3ee" floodOpacity="0.85" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g fill={`url(#${instanceId}-water-drop)`} filter={`url(#${instanceId}-water-glow)`}>
            <path className="profile-avatar-water__drop profile-avatar-water__drop--one" d="M15 8C13 16 6 20 7 27c1 7 10 8 14 3 4-6-3-13-6-22Z" />
            <path className="profile-avatar-water__drop profile-avatar-water__drop--two" d="M86 65c-2 7-9 11-8 18 1 7 10 8 14 3 4-6-3-13-6-21Z" />
            <path className="profile-avatar-water__drop profile-avatar-water__drop--three" d="M81 11c-1 4-5 7-4 11 1 4 6 5 9 1 2-4-3-8-5-12Z" />
            <path className="profile-avatar-water__drop profile-avatar-water__drop--four" d="M19 77c-1 4-5 7-4 11 1 4 6 5 9 1 2-4-3-8-5-12Z" />
          </g>
          <g className="profile-avatar-water__ripple" fill="none" stroke="#cffafe" strokeLinecap="round" strokeWidth="2.4" filter={`url(#${instanceId}-water-glow)`}>
            <path d="M5 43c6-5 12-5 18 0s12 5 18 0" />
            <path d="M59 58c6-5 12-5 18 0s12 5 18 0" />
          </g>
        </svg>
      )}
      {storeFrame?.id === "fire-blast" && (
        <svg className="profile-avatar-fire__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id={`${instanceId}-fire-flame`} x1="0" y1="1" x2="0.8" y2="0">
              <stop offset="0" stopColor="#ef4444" />
              <stop offset="0.52" stopColor="#fb923c" />
              <stop offset="1" stopColor="#fef08a" />
            </linearGradient>
            <filter id={`${instanceId}-fire-glow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.9" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g fill={`url(#${instanceId}-fire-flame)`} stroke="#fff7ae" strokeWidth="0.8" strokeLinejoin="round" filter={`url(#${instanceId}-fire-glow)`}>
            <path className="profile-avatar-fire__flame profile-avatar-fire__flame--one" d="M17 39c-8-7-4-14-6-21 10 5 13 12 11 18 5-5 5-10 4-14 9 9 7 20-1 25-5 3-11-1-8-8Z" />
            <path className="profile-avatar-fire__flame profile-avatar-fire__flame--two" d="M82 20c-7-8-2-14-3-20 10 6 13 14 10 21 5-5 5-10 4-14 9 10 6 21-2 25-6 3-12-3-9-12Z" />
            <path className="profile-avatar-fire__flame profile-avatar-fire__flame--three" d="M77 80c-8-7-4-14-6-21 10 5 13 12 11 18 5-5 5-10 4-14 9 9 7 20-1 25-5 3-11-1-8-8Z" />
            <path className="profile-avatar-fire__flame profile-avatar-fire__flame--four" d="M24 88c-7-7-3-13-4-19 9 5 12 11 9 18 5-4 5-9 4-13 8 9 6 19-2 23-5 3-10-2-7-9Z" />
          </g>
        </svg>
      )}
      {storeFrame?.id === "level-100-wings" && (
        <Image
          src="/profile-frames/level-100-wings.jpg"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          unoptimized
          className="profile-avatar-level-100-wings__overlay"
        />
      )}
      {!storeFrame && normalizedRole === "admin" && (
        <Image
          src="/profile-frames/admin-role.gif"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          unoptimized
          className="profile-avatar-admin__overlay"
        />
      )}
    </div>
  );
}
