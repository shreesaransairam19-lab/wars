import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopBar } from "@/components/layout/TopBar";
import { ChatView, type Room } from "@/components/chat/ChatView";
import { hasAnyRole } from "@/lib/permissions/guards";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <>
          <TopBar />
          <div className="grid h-[calc(100vh-64px)] place-items-center text-sm text-muted">
            Loading chat...
          </div>
        </>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

async function ChatContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (await getActiveChatBan(user.id)) redirect("/banned");
  const canManageCommunities = await hasAnyRole(user.id, ["owner", "admin"]);

  // Keep a public General community available even if this database predates
  // the migration that seeds default chat rooms.
  const admin = createAdminClient();
  let { data: generalCommunity } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("slug", "general-chat")
    .eq("room_type", "server")
    .maybeSingle();

  if (!generalCommunity) {
    const { data } = await admin
      .from("chat_rooms")
      .insert({ name: "General", slug: "general-chat", room_type: "server", visibility: "public" })
      .select("id")
      .maybeSingle();
    generalCommunity = data;
    if (!generalCommunity) {
      const retry = await admin
        .from("chat_rooms")
        .select("id")
        .eq("slug", "general-chat")
        .eq("room_type", "server")
        .maybeSingle();
      generalCommunity = retry.data;
    }
  }

  if (generalCommunity) {
    const { data: generalRoom } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("slug", "general-chat-general")
      .eq("room_type", "channel")
      .maybeSingle();
    if (!generalRoom) {
      const { error } = await admin.from("chat_rooms").insert({
        name: "general",
        slug: "general-chat-general",
        room_type: "channel",
        visibility: "public",
        parent_room_id: generalCommunity.id,
      });
      if (error) {
        // Another simultaneous page request may have created the room already.
        await admin.from("chat_rooms").select("id").eq("slug", "general-chat-general").maybeSingle();
      }
    }
  }

  const { data: rooms, error: roomsError } = await admin
    .from("chat_rooms")
    .select("*")
    .eq("visibility", "public")
    .order("room_type", { ascending: true })
    .order("name", { ascending: true });

  const roomLoadError = roomsError
    ? canManageCommunities
      ? `Could not load chat rooms: ${roomsError.message}`
      : "Chat rooms are temporarily unavailable. Please refresh."
    : undefined;

  return (
    <>
      <TopBar />
      <ChatView rooms={(rooms ?? []) as Room[]} roomsError={roomLoadError} currentUserId={user.id} canManageCommunities={canManageCommunities} />
    </>
  );
}
