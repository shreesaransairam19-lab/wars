// File upload validation

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_NOVEL_TYPES = [
  "application/epub+zip",
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_NOVEL_EXTENSIONS = [".epub"];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
export const MAX_NOVEL_SIZE = 50 * 1024 * 1024; // 50MB per novel file
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

export function validateNovelFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationResult {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (!ALLOWED_NOVEL_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file extension: ${ext}` };
  }

  if (!ALLOWED_NOVEL_TYPES.includes(file.type as (typeof ALLOWED_NOVEL_TYPES)[number])) {
    return { valid: false, error: `Invalid file type: ${file.type}` };
  }

  if (file.size > MAX_NOVEL_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_NOVEL_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
}

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
