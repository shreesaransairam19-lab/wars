import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { ChatView, type Room } from "@/components/chat/ChatView";

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

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("*")
    .order("room_type", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <TopBar />
      <ChatView rooms={(rooms ?? []) as Room[]} currentUserId={user.id} />
    </>
  );
}
