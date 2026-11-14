// File upload validation

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_DOCUMENT_EXTENSIONS = [".epub", ".pdf"];
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB per chapter document
export const MAX_NOVEL_SIZE = MAX_DOCUMENT_SIZE;
export const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB per cover

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationResult {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file extension: ${ext}` };
  }

  const expectedType = IMAGE_MIME_BY_EXTENSION[ext];
  if (file.type && (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) || file.type !== expectedType)) {
    return { valid: false, error: `Invalid file type: ${file.type}` };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
}

export function getImageMimeType(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return IMAGE_MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export function validateDocumentFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationResult {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Choose an EPUB or PDF document" };
  }

  const expectedType = ext === ".pdf" ? "application/pdf" : "application/epub+zip";
  // Browsers sometimes report EPUB as an empty MIME type; the extension is
  // still required. PDFs must use their standard MIME type when one is given.
  if (file.type && file.type !== expectedType) {
    return { valid: false, error: `Invalid file type: ${file.type}` };
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
}

export const validateNovelFile = validateDocumentFile;

export function validateCoverFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationResult {
  const result = validateImageFile(file);
  if (!result.valid) return result;

  if (file.size > MAX_COVER_SIZE) {
    return {
      valid: false,
      error: `Cover too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_COVER_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
}

// Generate a safe storage path (never use raw user filenames)
export function generateStoragePath(
  prefix: string,
  extension: string,
  id?: string
): string {
  const uniqueId = id ?? crypto.randomUUID();
  return `${prefix}/${uniqueId}.${extension.replace(".", "")}`;
}

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
const VIDEO_MIME_BY_EXTENSION: Record<string, (typeof ALLOWED_VIDEO_TYPES)[number]> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export function validateVideoFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationResult {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const expectedType = VIDEO_MIME_BY_EXTENSION[ext];

  if (!expectedType) {
    return { valid: false, error: "Choose an MP4 or WebM video" };
  }
  if (file.type && (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number]) || file.type !== expectedType)) {
    return { valid: false, error: `Invalid video type: ${file.type}` };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: "Video file is empty or invalid" };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: "Video must be 100 MB or smaller" };
  }

  return { valid: true };
}
