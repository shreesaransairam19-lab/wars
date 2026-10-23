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
  profiles: { username: string } | null;
  message_reactions?: { reaction: string; user_id: string }[];
}

interface Gif {
  id: string;
  title: string;
  preview: string;
  url: string;
}

export function ChatView({ rooms, currentUserId }: { rooms: Room[]; currentUserId: string }) {
  const channels = rooms.filter((r) => r.room_type === "channel");
  const servers = rooms.filter((r) => r.room_type === "server");
  const [activeServer, setActiveServer] = useState(servers[0]?.id ?? "");
  const [activeRoom, setActiveRoom] = useState(
    channels.find((c) => c.parent_room_id === servers[0]?.id)?.id ?? channels[0]?.id ?? ""
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const serverChannels = channels.filter((c) => c.parent_room_id === activeServer);
  const activeRoomName = channels.find((c) => c.id === activeRoom)?.name ?? "";

  useEffect(() => {
    if (!activeRoom) return;
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/chat/messages?room_id=${activeRoom}`);
      if (!res.ok) return;
      const json = await res.json();
      if (cancelled) return;
      setMessages(json.messages ?? []);
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

    return () => {
      cancelled = true;
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
    }
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
      <aside className="hidden w-48 shrink-0 border-r border-line bg-panel p-2 sm:block">
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
      </aside>

      {/* Messages */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="border-b border-line px-4 py-2.5">
          <h1 className="font-heading text-sm font-semibold"># {activeRoomName}</h1>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((message) => {
            const grouped = new Map<string, number>();
            (message.message_reactions ?? []).forEach((r) =>
              grouped.set(r.reaction, (grouped.get(r.reaction) ?? 0) + 1)
            );
            return (
              <div key={message.id} className="group">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-accent">
                    {message.profiles?.username ?? "reader"}
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
