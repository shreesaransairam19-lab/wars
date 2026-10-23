"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { validateImageFile, validateNovelFile } from "@/lib/security/file-validation";

interface UploadPanelProps {
  chapterId: string;
  assetType: "page" | "novel";
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
          assetType === "novel" ? validateNovelFile(meta) : validateImageFile(meta);

        if (!validation.valid) {
          results.push(`✗ ${file.name}: ${validation.error}`);
          setProgress([...results]);
          continue;
        }

        try {
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
        } catch {
          results.push(`✗ ${file.name}: Network error`);
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
            ? "Upload EPUB file"
            : "Upload page images"}
        </span>
        <input
          id={`upload-${chapterId}`}
          type="file"
          className="hidden"
          multiple={assetType === "page"}
          accept={assetType === "novel" ? ".epub" : "image/jpeg,image/png,image/webp"}
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
