// File upload validation

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_DOCUMENT_EXTENSIONS = [".epub", ".pdf"];

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

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
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
