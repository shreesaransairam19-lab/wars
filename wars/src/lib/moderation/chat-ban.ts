import { createAdminClient } from "@/lib/supabase/admin";

export async function getActiveChatBan(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_bans")
    .select("reason,created_at,expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  // A missing migration must not take public chat offline; once the table is
  // installed, all reads and writes enforce active bans.
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}
