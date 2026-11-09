import { createAdminClient } from "@/lib/supabase/admin";

export async function createSignedStorageUrl(storagePath: string | null | undefined, expiresIn = 3600) {
  if (!storagePath) return null;
  const separator = storagePath.indexOf("/");
  if (separator < 1) return null;
  const bucket = storagePath.slice(0, separator);
  const path = storagePath.slice(separator + 1);
  if (!path || !["covers", "chapter-assets"].includes(bucket)) return null;

  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}
