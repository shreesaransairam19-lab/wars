"use client";

import { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getImageMimeType } from "@/lib/security/file-validation";

export function CoverUpload({
  seriesId,
  hasCover,
  onUploaded,
}: {
  seriesId: string;
  hasCover: boolean;
  onUploaded?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const contentType = getImageMimeType({ name: file.name, type: file.type });
      const meta = { series_id: seriesId, name: file.name, type: contentType, size: file.size };
      const signedResponse = await fetch("/api/upload/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      const signed = await signedResponse.json();
      if (!signedResponse.ok) throw new Error(signed.error ?? "Could not start cover upload");

      const { error: uploadError } = await createClient()
        .storage.from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      const completeResponse = await fetch("/api/upload/cover", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, path: signed.path }),
      });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error ?? "Could not attach cover to series");

      setMessage("Cover saved");
      onUploaded?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cover upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-2 text-[10px] font-semibold text-muted hover:text-foreground">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
        {uploading ? "Uploading cover…" : hasCover ? "Replace front cover" : "Upload front cover"}
        <input
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      {message && <span role="status" className="max-w-sm break-words text-[10px] text-muted">{message}</span>}
    </div>
  );
}
