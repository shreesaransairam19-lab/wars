"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Trash2, Upload } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { getPrimaryRole } from "@/components/auth/RoleName";
import { useAuth } from "@/features/auth/useAuth";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function ProfilePage() {
  const { user, profile, roles, loading, refreshProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function uploadPicture() {
    if (!user || !selectedFile || busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (selectedFile.size > MAX_AVATAR_BYTES) {
        throw new Error("Choose an image smaller than 5 MB.");
      }

      const details = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      };
      const prepareResponse = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const upload = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) throw new Error(upload.error ?? "Could not prepare the upload.");

      const { error: uploadError } = await createClient()
        .storage
        .from("avatars")
        .uploadToSignedUrl(upload.path, upload.token, selectedFile, {
          contentType: selectedFile.type || upload.type,
          upsert: false,
        });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const attachResponse = await fetch("/api/user/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, path: upload.path }),
      });
      const attached = await attachResponse.json().catch(() => ({}));
      if (!attachResponse.ok) throw new Error(attached.error ?? "Could not save the profile picture.");

      await refreshProfile();
      window.dispatchEvent(new Event("wars:profile-updated"));
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage("Profile picture updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload the profile picture.");
    } finally {
      setBusy(false);
    }
  }

  async function removePicture() {
    if (!user || busy || !profile?.avatar_path) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/user/avatar", { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not remove the profile picture.");
      await refreshProfile();
      window.dispatchEvent(new Event("wars:profile-updated"));
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage("Profile picture removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the profile picture.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <><TopBar /><main className="mx-auto w-full max-w-3xl px-4 py-16"><div className="h-24 animate-pulse rounded-xl bg-panel" /></main></>;
  }

  if (!user) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Sign in to edit your profile</h1>
          <Link href="/login?next=/profile" className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11]">Sign in</Link>
        </main>
      </>
    );
  }

  const displayName = profile?.display_name || profile?.username || "Reader";
  const primaryRole = getPrimaryRole(roles);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <section className="rounded-2xl border border-line bg-panel p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <ProfileAvatar
              userId={user.id}
              avatarPath={profile?.avatar_path}
              previewSrc={previewUrl || null}
              name={displayName}
              role={primaryRole}
              size={96}
              className="border border-line"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Profile</p>
              <h1 className="mt-1 font-heading text-2xl font-semibold">Profile picture</h1>
              <p className="mt-1 text-sm text-muted">Shown beside your name in WARS. JPG, PNG, WebP, or GIF · max 5 MB.</p>
            </div>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              setError("");
              setMessage("");
              setSelectedFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel2 px-4 py-2.5 text-sm font-semibold hover:border-accent disabled:opacity-50">
              <ImagePlus className="h-4 w-4" /> Choose picture
            </button>
            {selectedFile && (
              <button type="button" onClick={uploadPicture} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-50">
                <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Save picture"}
              </button>
            )}
            {profile?.avatar_path && !selectedFile && (
              <button type="button" onClick={removePicture} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#704044] px-4 py-2.5 text-sm font-semibold text-[#ffb2b2] hover:bg-[#332329] disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Remove picture
              </button>
            )}
          </div>

          {selectedFile && <p className="mt-3 text-xs text-muted">Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
          {error && <p role="alert" className="mt-4 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-lg border border-[#41613a] bg-[#1b2a20] px-3 py-2 text-sm text-[#b8f28a]">{message}</p>}
        </section>
      </main>
    </>
  );
}
