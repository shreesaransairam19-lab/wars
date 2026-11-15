import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ChatView } from "@/components/chat/ChatView";
import { createClient } from "@/lib/supabase/server";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

export const metadata = {
  title: "AniChat | WARS",
  description: "Private messages for WARS readers and moderators.",
};

export default async function AniChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (await getActiveChatBan(user.id)) redirect("/banned");

  return (
    <>
      <TopBar />
      <ChatView rooms={[]} currentUserId={user.id} canManageCommunities={false} privateMessagesOnly />
    </>
  );
}
