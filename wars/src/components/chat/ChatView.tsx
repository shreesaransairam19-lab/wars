"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, ImagePlay } from "lucide-react";

export interface Room {
  id: string;
  name: string;
  slug: string;
  room_type: "server" | "channel" | "dm";
  parent_room_id: string | null;
}

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_id: string;
  profiles: { username: string; display_name?: string | null } | null;
  message_reactions?: { reaction: string; user_id: string }[];
}

interface Gif {
  id: string;
  title: string;
  preview: string;
  url: string;
}

export function ChatView({ rooms, currentUserId, canManageCommunities }: { rooms: Room[]; currentUserId: string; canManageCommunities: boolean }) {
  const channels = rooms.filter((r) => r.room_type === "channel");
  const servers = rooms.filter((r) => r.room_type === "server");
  const [dms, setDms] = useState<Room[]>([]);
  const [activeServer, setActiveServer] = useState(servers[0]?.id ?? "");
  const [activeRoom, setActiveRoom] = useState(
    channels.find((c) => c.parent_room_id === servers[0]?.id)?.id ?? channels[0]?.id ?? ""
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const serverChannels = channels.filter((c) => c.parent_room_id === activeServer);
  const activeRoomData = rooms.find((c) => c.id === activeRoom) ?? dms.find((c) => c.id === activeRoom);
  const activeRoomName = activeRoomData?.name ?? "";

  useEffect(() => {
    void fetch("/api/chat/dms").then(async (res) => {
      if (res.ok) setDms((await res.json()).conversations ?? []);
    });
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    let cancelled = false;
    setMessages([]);
    setLoading(true);

    async function load() {
      const res = await fetch(`/api/chat/messages?room_id=${activeRoom}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (!cancelled) { setError(json.error ?? "Could not load chat messages"); setLoading(false); }
      } else {
        const json = await res.json();
        if (!cancelled) { setMessages(json.messages ?? []); setError(""); setLoading(false); }
      }
    }
    void load();

    const supabase = createClient();
    const channel = supabase
      .channel(`room:${activeRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoom}` },
        () => void load()
      )
      .subscribe();
    // Realtime is not enabled on every Supabase project; polling keeps chat usable there too.
    const refreshTimer = window.setInterval(() => void load(), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeRoom) return;
    setInput("");
    setError("");
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: activeRoom, content }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not send");
      setInput(content);
    } else {
      const refresh = await fetch(`/api/chat/messages?room_id=${activeRoom}`);
      if (refresh.ok) setMessages((await refresh.json()).messages ?? []);
    }
  }

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/chat/dms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "Could not start private message"); return; }
    const conversation = json.conversation as Room;
    setDms((prev) => [conversation, ...prev.filter((dm) => dm.id !== conversation.id)]);
    setActiveRoom(conversation.id);
    setUsername("");
    setError("");
  }

  async function changeCommunity(action: "create-community" | "create-room" | "remove", room?: Room) {
    if (action === "remove" && room && !window.confirm(`Remove ${room.name}? ${room.room_type === "server" ? "This also removes all rooms and message history inside it." : "This also removes its message history."}`)) return;
    const response = action === "remove" && room
      ? await fetch("/api/chat/communities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: room.id, room_type: room.room_type }) })
      : await fetch("/api/chat/communities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "create-community" ? { name: communityName } : { name: roomName, community_id: activeServer }) });
    if (!response.ok) { const json = await response.json().catch(() => ({})); setError(json.error ?? "Could not update chat rooms"); return; }
    window.location.reload();
  }

  async function searchGifs(query: string) {
    const res = await fetch(`/api/gifs?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const json = await res.json();
    setGifs(json.gifs ?? []);
  }

  async function sendGif(url: string) {
    if (!activeRoom) return;
    setGifOpen(false);
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: activeRoom, content: url, message_type: "image" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not send GIF");
    }
  }

  async function toggleReaction(messageId: string, reaction: string) {
    await fetch("/api/chat/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId, reaction }),
    });
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const list = m.message_reactions ?? [];
        const exists = list.some(
          (r) => r.user_id === currentUserId && r.reaction === reaction
        );
        return {
          ...m,
          message_reactions: exists
            ? list.filter(
                (r) => !(r.user_id === currentUserId && r.reaction === reaction)
              )
            : [...list, { reaction, user_id: currentUserId }],
        };
      })
    );
  }

  function openServer(serverId: string) {
    setActiveServer(serverId);
    const first = channels.find((c) => c.parent_room_id === serverId);
    if (first) setActiveRoom(first.id);
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Servers */}
      <nav
        aria-label="Servers"
        className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-line bg-[#141419] py-3"
      >
        {servers.map((server) => (
          <button
            key={server.id}
            type="button"
            onClick={() => openServer(server.id)}
            title={server.name}
            aria-pressed={server.id === activeServer}
            className={`grid h-10 w-10 place-items-center rounded-xl text-[11px] font-bold transition-colors ${
              server.id === activeServer
                ? "bg-accent text-[#171a11]"
                : "bg-[#26242e] text-muted hover:text-foreground"
            }`}
          >
            {server.name.slice(0, 2)}
          </button>
        ))}
      </nav>

      {/* Channels */}
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-line bg-panel p-2 sm:block">
        <h2 className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Channels
        </h2>
        <ul>
          {serverChannels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => setActiveRoom(channel.id)}
                aria-current={channel.id === activeRoom}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  channel.id === activeRoom
                    ? "bg-panel2 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                # {channel.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-3">
          <h2 className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">Private messages</h2>
          <form className="flex gap-1 px-1 py-2" onSubmit={startDm}>
            <input className="min-w-0 flex-1 rounded border border-line bg-panel2 px-2 py-1 text-xs" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" aria-label="Member username" />
            <button className="rounded bg-panel2 px-2 text-xs" type="submit">+</button>
          </form>
          {dms.map((dm) => <button key={dm.id} className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${activeRoom === dm.id ? "bg-panel2" : "text-muted"}`} onClick={() => setActiveRoom(dm.id)} type="button">@ {dm.name}</button>)}
          <p className="px-2 pt-1 text-[10px] text-muted">PM readers and moderators. Contact Owner, Admin, or Editor through Feedback.</p>
        </div>
        {canManageCommunities && <div className="mt-4 border-t border-line pt-3">
          <h2 className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">Communities (Owner/Admin)</h2>
          <form className="space-y-1 p-1" onSubmit={(e) => { e.preventDefault(); void changeCommunity("create-community"); }}><input className="w-full rounded border border-line bg-panel2 px-2 py-1 text-xs" value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="New community" /><button className="w-full rounded bg-panel2 py-1 text-xs" type="submit">Create community</button></form>
          {activeServer && <form className="space-y-1 p-1" onSubmit={(e) => { e.preventDefault(); void changeCommunity("create-room"); }}><input className="w-full rounded border border-line bg-panel2 px-2 py-1 text-xs" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room in selected community" /><button className="w-full rounded bg-panel2 py-1 text-xs" type="submit">Create room</button></form>}
          {servers.map((server) => <button key={server.id} className="block px-2 py-1 text-left text-[10px] text-pink" onClick={() => void changeCommunity("remove", server)} type="button">Remove {server.name}</button>)}
          {serverChannels.map((channel) => <button key={channel.id} className="block px-2 py-1 text-left text-[10px] text-pink" onClick={() => void changeCommunity("remove", channel)} type="button">Remove #{channel.name}</button>)}
        </div>}
      </aside>

      {/* Messages */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="border-b border-line px-4 py-2.5">
          <h1 className="font-heading text-sm font-semibold">{activeRoomData?.room_type === "dm" ? `@ ${activeRoomName}` : `# ${activeRoomName}`}</h1>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loading && messages.length === 0 && <p className="text-sm text-muted">Loading messages…</p>}
          {!loading && messages.length === 0 && !error && <p className="text-sm text-muted">No messages yet. Start the conversation.</p>}
          {messages.map((message) => {
            const grouped = new Map<string, number>();
            (message.message_reactions ?? []).forEach((r) =>
              grouped.set(r.reaction, (grouped.get(r.reaction) ?? 0) + 1)
            );
            return (
              <div key={message.id} className="group">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-accent">
                    {message.profiles?.display_name || message.profiles?.username || "reader"}
                  </span>
                  <time className="text-[10px] text-muted">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                {message.message_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.content}
                    alt="GIF"
                    loading="lazy"
                    className="mt-1 max-h-56 rounded-lg"
                  />
                ) : (
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                    {message.content}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-1">
                  {[...grouped.entries()].map(([reaction, n]) => (
                    <button
                      key={reaction}
                      type="button"
                      onClick={() => toggleReaction(message.id, reaction)}
                      className="rounded-full border border-line px-1.5 py-0.5 text-[10px]"
                    >
                      {reaction} {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleReaction(message.id, "👍")}
                    className="rounded-full border border-transparent px-1.5 py-0.5 text-[10px] text-muted opacity-0 transition-opacity hover:border-line group-hover:opacity-100 focus:opacity-100"
                    aria-label="React with thumbs up"
                  >
                    👍
                  </button>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {gifOpen && (
          <div className="border-t border-line bg-panel p-3">
            <input
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchGifs(gifQuery);
                }
              }}
              placeholder="Search GIFs and press Enter"
              aria-label="Search GIFs"
              className="mb-2 w-full rounded-lg border border-line bg-panel2 px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => sendGif(gif.url)}
                  className="overflow-hidden rounded-md border border-transparent hover:border-accent"
                  aria-label={gif.title || "Send GIF"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gif.preview} alt="" loading="lazy" className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={send} className="border-t border-line p-3">
          {error && <p className="mb-1.5 text-[11px] text-pink">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGifOpen((v) => !v);
                if (!gifOpen && gifs.length === 0) void searchGifs("");
              }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-foreground"
              aria-label="Toggle GIF search"
              aria-expanded={gifOpen}
            >
              <ImagePlay className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
              placeholder={`Message #${activeRoomName}`}
              aria-label="Message"
              className="flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-[#171a11] disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
