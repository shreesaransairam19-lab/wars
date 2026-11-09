import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BanAppealForm } from "@/components/chat/BanAppealForm";
import { createClient } from "@/lib/supabase/server";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

export default function BannedPage() {
  return (
    <Suspense
      fallback={
        <>
          <TopBar />
          <div className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-muted">
            Loading account status...
          </div>
        </>
      }
    >
      <BannedContent />
    </Suspense>
  );
}

async function BannedContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await getActiveChatBan(user.id))) redirect("/chat");

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-pink">Chat access restricted</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">You can’t use WARS chat right now</h1>
        <p className="mt-2 text-sm text-muted">You can still sign in and appeal the decision. Admins and the Owner review appeals.</p>
        <BanAppealForm />
      </main>
    </>
  );
}
