"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { validateDocumentFile, validateImageFile } from "@/lib/security/file-validation";
import { createClient } from "@/lib/supabase/client";

interface UploadPanelProps {
  chapterId: string;
  assetType: "page" | "novel" | "document";
  onPageUploaded?: () => void;
}

export function UploadPanel({ chapterId, assetType, onPageUploaded }: UploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (files: FileList) => {
      setUploading(true);
      setError("");
      setProgress([]);

      const results: string[] = [];

      for (const file of Array.from(files)) {
        const meta = { name: file.name, type: file.type, size: file.size };
        const validation =
          assetType !== "page" ? validateDocumentFile(meta) : validateImageFile(meta);

        if (!validation.valid) {
          results.push(`✗ ${file.name}: ${validation.error}`);
          setProgress([...results]);
          continue;
        }

        try {
          if (assetType !== "page") {
            const signedRes = await fetch("/api/upload/novel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chapter_id: chapterId,
                name: file.name,
                type: file.type,
                size: file.size,
              }),
            });
            const signed = await signedRes.json();
            if (!signedRes.ok) throw new Error(signed.error ?? "Could not start document upload");

            const { error: uploadError } = await createClient()
              .storage.from(signed.bucket)
              .uploadToSignedUrl(signed.path, signed.token, file, {
                contentType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/epub+zip"),
                upsert: false,
              });
            if (uploadError) throw new Error(uploadError.message);

            const completeRes = await fetch("/api/upload/novel", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chapter_id: chapterId,
                path: signed.path,
                name: file.name,
                type: file.type,
                size: file.size,
              }),
            });
            const complete = await completeRes.json();
            if (!completeRes.ok) throw new Error(complete.error ?? "Could not attach document to chapter");
            results.push(`✓ ${file.name}`);
            setProgress([...results]);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("chapter_id", chapterId);
          formData.append("asset_type", assetType);
          formData.append("page_number", String(results.length + 1));
          formData.append("order_index", String(results.length));

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (res.ok) {
            results.push(`✓ ${file.name}`);
          } else {
            results.push(`✗ ${file.name}: ${data.error}`);
          }
        } catch (err) {
          results.push(`✗ ${file.name}: ${err instanceof Error ? err.message : "Network error"}`);
        }

        setProgress([...results]);
      }

      setUploading(false);
      onPageUploaded?.();
    },
    [chapterId, assetType, onPageUploaded]
  );

  return (
    <div className="rounded-lg border border-dashed border-[#4a4655] p-3">
      <label
        htmlFor={`upload-${chapterId}`}
        className="flex cursor-pointer items-center gap-2 text-[10px] text-muted hover:text-foreground"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>
          {uploading
            ? "Uploading…"
            : assetType === "novel"
            ? "Upload EPUB or PDF"
            : assetType === "document"
            ? "Upload PDF document"
            : "Upload page images"}
        </span>
        <input
          id={`upload-${chapterId}`}
          type="file"
          className="hidden"
          multiple={assetType === "page"}
          accept={assetType === "page" ? "image/jpeg,image/png,image/webp" : assetType === "document" ? ".pdf,application/pdf" : ".epub,.pdf,application/epub+zip,application/pdf"}
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </label>

      {error && (
        <p className="mt-2 text-[10px] text-[#ffb2b2]">{error}</p>
      )}

      {progress.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {progress.map((msg, i) => (
            <li key={i} className="text-[9px] text-muted">
              {msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
