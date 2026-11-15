"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { RoleName } from "@/components/auth/RoleName";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { ArrowLeft, Send, ImagePlay, Smile, Paperclip } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import giphyPoweredBy from "@/assets/giphy-powered-by.svg";

export interface Room {
  id: string;
  name: string;
  slug: string;
  room_type: "server" | "channel" | "dm";
  parent_room_id: string | null;
  peer_id?: string | null;
  username?: string;
}

const CHAT_EMOJIS = ["😀", "😄", "😂", "🥹", "😍", "😎", "🤔", "😭", "😅", "😊", "🙂", "🙃", "😉", "😴", "😮", "🤯", "🥳", "😤", "❤️", "💜", "💙", "✨", "🔥", "⚡", "🎉", "👏", "👍", "👎", "🙏", "🤝", "💀", "🍿", "🌸", "🗿"];

function isGeneralServer(room: Room) {
  return room.room_type === "server" && room.slug === "general-chat";
}

function isGeneralChannel(room: Room, generalServerId?: string) {
  return room.room_type === "channel" && (
    room.slug === "general-chat-general" ||
    (Boolean(generalServerId) && room.parent_room_id === generalServerId && room.name.trim().toLowerCase() === "general")
  );
}

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_id: string;
  profiles: { username: string; display_name?: string | null; avatar_path?: string | null; role?: string | null; roles?: string[]; frame_id?: string | null } | null;
  message_reactions?: { reaction: string; user_id: string }[];
  delivery?: "sending" | "sent";
  attachment?: { id: string; name: string; type: string; size: number };
}

interface IncomingFileTransfer {
  id: string;
  name: string;
  type: string;
  size: number;
  chunks: ArrayBuffer[];
  received: number;
}

interface Gif {
  id: string;
  title: string;
  preview: string;
  pageUrl: string | null;
  username: string | null;
  userProfileUrl: string | null;
}

interface GiphyMessageDetails {
  id: string;
  username: string | null;
  userProfileUrl: string | null;
  pageUrl: string | null;
}

function isDirectImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /\.(gif|png|jpe?g|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function giphyMessageContent(gif: Gif) {
  const details = [
    encodeURIComponent(gif.username ?? ""),
    encodeURIComponent(gif.userProfileUrl ?? ""),
    encodeURIComponent(gif.pageUrl ?? ""),
  ];
  return `giphy:${gif.id}|${details.join("|")}`;
}

function parseGiphyMessage(content: string): GiphyMessageDetails | null {
  if (!content.startsWith("giphy:")) return null;
  const [id, username = "", userProfileUrl = "", pageUrl = ""] = content.slice(6).split("|");
  if (!id || !/^[\w-]{1,128}$/.test(id)) return null;
  try {
    return {
      id,
      username: decodeURIComponent(username) || null,
      userProfileUrl: decodeURIComponent(userProfileUrl) || null,
      pageUrl: decodeURIComponent(pageUrl) || null,
    };
  } catch {
    return null;
  }
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["giphy.com", "www.giphy.com"].includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function dmStorageKey(userId: string, roomId: string) {
  return `wars:private-messages:${userId}:${roomId}`;
}

function readLocalDmMessages(userId: string, roomId: string): Message[] {
  try {
    const stored = localStorage.getItem(dmStorageKey(userId, roomId));
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed as Message[] : [];
  } catch {
    return [];
  }
}

function saveLocalDmMessages(userId: string, roomId: string, messages: Message[]) {
  try {
    localStorage.setItem(dmStorageKey(userId, roomId), JSON.stringify(messages));
  } catch {
    // Private history remains best-effort local data if browser storage is full.
  }
}

function mergeDmMessage(messages: Message[], message: Message) {
  return [...messages.filter((item) => item.id !== message.id), message]
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

let dmFilesDatabase: Promise<IDBDatabase> | null = null;

function openDmFilesDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Browser file storage is unavailable."));
  if (!dmFilesDatabase) dmFilesDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open("wars-private-attachments", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open private file storage."));
  });
  return dmFilesDatabase;
}

function dmFileKey(userId: string, roomId: string, attachmentId: string) {
  return `${userId}:${roomId}:${attachmentId}`;
}

async function saveDmFile(userId: string, roomId: string, attachmentId: string, blob: Blob) {
  const db = await openDmFilesDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    transaction.objectStore("files").put({ key: dmFileKey(userId, roomId, attachmentId), blob });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save private file."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Private file save was cancelled."));
  });
}

async function loadDmFile(userId: string, roomId: string, attachmentId: string): Promise<Blob | null> {
  const db = await openDmFilesDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readonly");
    const request = transaction.objectStore("files").get(dmFileKey(userId, roomId, attachmentId));
    request.onsuccess = () => resolve((request.result?.blob as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read private file."));
  });
}

export function ChatView({ rooms, roomsError, currentUserId, canManageCommunities, privateMessagesOnly = false, initialConversationId }: { rooms: Room[]; roomsError?: string; currentUserId: string; canManageCommunities: boolean; privateMessagesOnly?: boolean; initialConversationId?: string }) {
  const [roomList, setRoomList] = useState(rooms);
  const servers = roomList
    .filter((r) => r.room_type === "server")
    .sort((a, b) => Number(!isGeneralServer(a)) - Number(!isGeneralServer(b)) || a.name.localeCompare(b.name));
  const generalServerId = servers.find(isGeneralServer)?.id;
  const channels = roomList
    .filter((r) => r.room_type === "channel")
    .sort((a, b) => Number(!isGeneralChannel(a, generalServerId)) - Number(!isGeneralChannel(b, generalServerId)) || a.name.localeCompare(b.name));
  const [dms, setDms] = useState<Room[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Message["profiles"]>(null);
  const [activeServer, setActiveServer] = useState(servers[0]?.id ?? "");
  const [activeRoom, setActiveRoom] = useState(() => privateMessagesOnly
    ? ""
    : channels.find((c) => c.parent_room_id === servers[0]?.id)?.id ?? channels[0]?.id ?? ""
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(roomsError ?? "");
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [updatingRooms, setUpdatingRooms] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [gifError, setGifError] = useState("");
  const [gifLoading, setGifLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dmChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingMessagesRef = useRef(new Map<string, { roomId: string; message: Message }>());
  const rtcPeerRef = useRef<RTCPeerConnection | null>(null);
  const rtcDataChannelRef = useRef<RTCDataChannel | null>(null);
  const ensureRtcDataChannelRef = useRef<(() => Promise<RTCDataChannel>) | null>(null);
  const incomingTransfersRef = useRef(new Map<string, IncomingFileTransfer>());
  const attachmentUrlsRef = useRef<Record<string, string>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [fileBusy, setFileBusy] = useState(false);
  const [fileProgress, setFileProgress] = useState("");
  const [dmConnected, setDmConnected] = useState(false);
  const [dmPeerOnline, setDmPeerOnline] = useState(false);

  const serverChannels = channels.filter((c) => c.parent_room_id === activeServer);
  const activeRoomData = roomList.find((c) => c.id === activeRoom) ?? dms.find((c) => c.id === activeRoom);
  const activeRoomName = activeRoomData?.name ?? "";
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/chat/dms").then(async (res) => {
      if (!res.ok) return;
      const result = await res.json().catch(() => ({}));
      if (cancelled) return;
      const loadedConversations = result.conversations ?? [];
      setDms(loadedConversations);
      setCurrentUserProfile(result.currentUserProfile ?? null);
      if (initialConversationId && loadedConversations.some((conversation: Room) => conversation.id === initialConversationId)) {
        setActiveRoom(initialConversationId);
      }
    });
    return () => { cancelled = true; };
  }, [initialConversationId]);

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let loadingMessages = false;
    let rateLimitedUntil = 0;
    let retryTimer: number | null = null;
    setMessages([]);
    setLoading(true);
    setError("");
    setSendError("");

    if (privateMessagesOnly && !activeRoomData) return;

    if (activeRoomData?.room_type === "dm") {
      const localMessages = readLocalDmMessages(currentUserId, activeRoom);
      setMessages(localMessages);
      setLoading(false);
      setDmConnected(false);
      setDmPeerOnline(false);
      setFileBusy(false);
      setFileProgress("");
      incomingTransfersRef.current.clear();
      Object.values(attachmentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      attachmentUrlsRef.current = {};
      setAttachmentUrls({});
      for (const message of localMessages) {
        if (message.attachment) {
          void loadDmFile(currentUserId, activeRoom, message.attachment.id).then((blob) => {
            if (cancelled || !blob) return;
            const url = URL.createObjectURL(blob);
            attachmentUrlsRef.current = { ...attachmentUrlsRef.current, [message.attachment!.id]: url };
            setAttachmentUrls((current) => ({ ...current, [message.attachment!.id]: url }));
          }).catch(() => undefined);
        }
      }

      const supabase = isSupabaseConfigured() ? createClient() : null;
      if (!supabase) {
        setSendError("Live private messaging is unavailable right now.");
        return () => { cancelled = true; };
      }

      const channel = supabase.channel(`dm:${activeRoom}`, { config: { private: true, broadcast: { self: false } } });
      let makingOffer = false;
      let ignoreOffer = false;
      const peerId = activeRoomData.peer_id;
      const sendSignal = (signal: Record<string, unknown>) => {
        if (!peerId) return;
        void channel.send({ type: "broadcast", event: "rtc-signal", payload: { ...signal, senderId: currentUserId, targetId: peerId } });
      };
      const getPeerConnection = () => {
        if (rtcPeerRef.current) return rtcPeerRef.current;
        const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        rtcPeerRef.current = peer;
        peer.onicecandidate = (event) => { if (event.candidate) sendSignal({ kind: "candidate", candidate: event.candidate.toJSON() }); };
        peer.onnegotiationneeded = async () => {
          try {
            makingOffer = true;
            await peer.setLocalDescription();
            if (peer.localDescription) sendSignal({ kind: "description", description: peer.localDescription.toJSON() });
          } catch (cause) {
            console.warn("Private file connection negotiation failed", cause);
          } finally {
            makingOffer = false;
          }
        };
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "failed" || peer.connectionState === "closed") setSendError("Direct file transfer could not connect. Keep both readers online and retry.");
        };
        peer.ondatachannel = (event) => setupPrivateFileChannel(event.channel);
        return peer;
      };
      const setupPrivateFileChannel = (dataChannel: RTCDataChannel) => {
        if (rtcDataChannelRef.current && rtcDataChannelRef.current !== dataChannel && rtcDataChannelRef.current.readyState === "open") {
          dataChannel.close();
          return;
        }
        rtcDataChannelRef.current = dataChannel;
        dataChannel.binaryType = "arraybuffer";
        dataChannel.bufferedAmountLowThreshold = 256 * 1024;
        dataChannel.onmessage = (event) => {
          if (typeof event.data === "string") {
            let packet: { type?: string; id?: string; name?: string; mimeType?: string; size?: number };
            try { packet = JSON.parse(event.data) as typeof packet; } catch { return; }
            if (packet.type === "file-start" && typeof packet.id === "string" && typeof packet.name === "string" && typeof packet.mimeType === "string" && typeof packet.size === "number" && packet.size > 0 && packet.size <= 15 * 1024 * 1024 && /^(image|video)\//.test(packet.mimeType)) {
              incomingTransfersRef.current.set(packet.id, { id: packet.id, name: packet.name.slice(0, 180), type: packet.mimeType, size: packet.size, chunks: [], received: 0 });
              setFileProgress(`Receiving ${packet.name}…`);
            } else if (packet.type === "file-complete") {
              setFileProgress("");
            }
            return;
          }
          const bytes = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : null;
          if (!bytes || bytes.byteLength <= 36) return;
          const attachmentId = new TextDecoder().decode(bytes.subarray(0, 36));
          const transfer = incomingTransfersRef.current.get(attachmentId);
          if (!transfer) return;
          const chunk = bytes.slice(36).buffer;
          transfer.chunks.push(chunk);
          transfer.received += chunk.byteLength;
          setFileProgress(`Receiving ${transfer.name} · ${Math.min(100, Math.floor(transfer.received / transfer.size * 100))}%`);
          if (transfer.received >= transfer.size) {
            incomingTransfersRef.current.delete(attachmentId);
            const blob = new Blob(transfer.chunks, { type: transfer.type });
            void saveDmFile(currentUserId, activeRoom, attachmentId, blob).then(() => {
              const url = URL.createObjectURL(blob);
              const previousUrl = attachmentUrlsRef.current[attachmentId];
              if (previousUrl) URL.revokeObjectURL(previousUrl);
              attachmentUrlsRef.current = { ...attachmentUrlsRef.current, [attachmentId]: url };
              setAttachmentUrls((current) => ({ ...current, [attachmentId]: url }));
              dataChannel.send(JSON.stringify({ type: "file-complete", id: attachmentId }));
              setFileProgress("");
            }).catch(() => setSendError("The received file could not be saved in this browser."));
          }
        };
        dataChannel.onopen = () => { setSendError(""); setFileProgress(""); };
        dataChannel.onclose = () => { if (rtcDataChannelRef.current === dataChannel) rtcDataChannelRef.current = null; };
      };
      ensureRtcDataChannelRef.current = async () => {
        const peer = getPeerConnection();
        let dataChannel = rtcDataChannelRef.current;
        if (!dataChannel || dataChannel.readyState === "closed") {
          if (currentUserId < (peerId ?? "")) {
            dataChannel = peer.createDataChannel("private-files", { ordered: true });
            setupPrivateFileChannel(dataChannel);
          } else {
            sendSignal({ kind: "request-channel" });
          }
        }
        if (dataChannel?.readyState === "open") return dataChannel;
        return await new Promise<RTCDataChannel>((resolve, reject) => {
          const start = Date.now();
          const timer = window.setInterval(() => {
            const live = rtcDataChannelRef.current;
            if (live?.readyState === "open") { window.clearInterval(timer); resolve(live); }
            else if (Date.now() - start > 20000 || live?.readyState === "closed") { window.clearInterval(timer); reject(new Error("Could not connect a direct private file-transfer channel.")); }
          }, 100);
        });
      };
      channel
        .on("presence", { event: "sync" }, () => {
          const online = Object.values(channel.presenceState()).flat().some(
            (presence) => (presence as { user_id?: string }).user_id === activeRoomData.peer_id
          );
          setDmPeerOnline(Boolean(online));
        })
        .on("broadcast", { event: "message" }, ({ payload }) => {
          const message = payload?.message as Message | undefined;
          if (!message || typeof message.id !== "string" || typeof message.content !== "string" || message.sender_id === currentUserId || (peerId && message.sender_id !== peerId)) return;
          setMessages((current) => {
            const next = mergeDmMessage(current, message);
            saveLocalDmMessages(currentUserId, activeRoom, next);
            return next;
          });
        })
        .on("broadcast", { event: "rtc-signal" }, async ({ payload }) => {
          if (!payload || payload.targetId !== currentUserId || payload.senderId !== peerId) return;
          const peer = getPeerConnection();
          try {
            if (payload.kind === "request-channel") {
              if (currentUserId < (peerId ?? "") && !rtcDataChannelRef.current) setupPrivateFileChannel(peer.createDataChannel("private-files", { ordered: true }));
            } else if (payload.kind === "description" && payload.description && typeof payload.description === "object") {
              const description = payload.description as RTCSessionDescriptionInit;
              if (description.type === "offer") {
                if (makingOffer || peer.signalingState !== "stable") return;
                await peer.setRemoteDescription(description);
                await peer.setLocalDescription(await peer.createAnswer());
                if (peer.localDescription) sendSignal({ kind: "description", description: peer.localDescription.toJSON() });
              } else if (description.type === "answer" && peer.signalingState === "have-local-offer") {
                await peer.setRemoteDescription(description);
              }
            } else if (payload.kind === "candidate" && payload.candidate) {
              await peer.addIceCandidate(payload.candidate as RTCIceCandidateInit).catch((cause) => { if (!ignoreOffer) throw cause; });
            }
          } catch (cause) {
            console.warn("Private file connection signaling failed", cause);
          }
        })
        .subscribe((status) => {
          if (cancelled) return;
          setDmConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            void channel.track({ user_id: currentUserId });
          } else {
            setDmPeerOnline(false);
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setSendError("Could not connect to the private-message relay. Reopen the chat to retry.");
          } else if (status === "SUBSCRIBED") {
            setSendError("");
          }
        });
      dmChannelRef.current = channel;

      return () => {
        cancelled = true;
        setDmConnected(false);
        setDmPeerOnline(false);
        if (dmChannelRef.current === channel) dmChannelRef.current = null;
        ensureRtcDataChannelRef.current = null;
        rtcDataChannelRef.current?.close();
        rtcDataChannelRef.current = null;
        rtcPeerRef.current?.close();
        rtcPeerRef.current = null;
        incomingTransfersRef.current.clear();
        Object.values(attachmentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
        attachmentUrlsRef.current = {};
        setAttachmentUrls({});
        void supabase.removeChannel(channel);
      };
    }

    setDmConnected(false);

    async function load() {
      if (cancelled || loadingMessages || document.visibilityState === "hidden" || Date.now() < rateLimitedUntil) return;
      loadingMessages = true;
      try {
        const res = await fetch(`/api/chat/messages?room_id=${activeRoom}`, { cache: "no-store" });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (res.status === 429) {
            const retryAfter = Math.max(1, Math.min(60, Number(res.headers.get("Retry-After")) || 5));
            rateLimitedUntil = Date.now() + retryAfter * 1000;
            if (!cancelled) setError(`${json.error ?? "Chat is refreshing too often."} Retrying in ${retryAfter}s.`);
            if (retryTimer !== null) window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              void load();
            }, retryAfter * 1000);
          } else if (!cancelled) {
            setError(json.error ?? "Could not load chat messages");
          }
        } else {
          rateLimitedUntil = 0;
          const json = await res.json();
          if (!cancelled) {
            const incoming = (json.messages ?? []) as Message[];
            const incomingIds = new Set(incoming.map((message) => message.id));
            for (const [id, pending] of pendingMessagesRef.current) {
              if (pending.roomId !== activeRoom) continue;
              if (incomingIds.has(id)) {
                pendingMessagesRef.current.delete(id);
              } else {
                incoming.push(pending.message);
              }
            }
            incoming.sort((a, b) => a.created_at.localeCompare(b.created_at));
            setMessages(incoming);
            setError("");
          }
        }
      } catch {
        if (!cancelled) setError("Connection interrupted. Reconnecting…");
      } finally {
        loadingMessages = false;
        if (!cancelled) setLoading(false);
      }
    }
    void load();

    const supabase = isSupabaseConfigured() ? createClient() : null;
    let refreshTimer: number | null = null;
    const startFallbackPolling = () => {
      if (refreshTimer === null) refreshTimer = window.setInterval(() => void load(), 5000);
    };
    const stopFallbackPolling = () => {
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };
    const channel = supabase?.channel(`room:${activeRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoom}` },
        () => void load()
      );
    // Realtime handles normal updates. Poll only while it is unavailable,
    // avoiding a database request every half-second for every open chat.
    startFallbackPolling();
    channel?.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") stopFallbackPolling();
      else startFallbackPolling();
    });
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      stopFallbackPolling();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
    }, [activeRoom, activeRoomData?.room_type, activeRoomData?.peer_id, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeRoom) return;
    const isDm = activeRoomData?.room_type === "dm";
    if (isDm && (!dmConnected || !dmChannelRef.current)) {
      setSendError("Connect to the live private-message relay before sending.");
      return;
    }
    if (isDm && !dmPeerOnline) {
      setSendError("The other reader is offline. Messages aren’t queued for later delivery.");
      return;
    }

    const messageId = crypto.randomUUID();
    const ownProfile = messages.find((message) => message.sender_id === currentUserId)?.profiles ?? currentUserProfile ?? {
      username: "You",
      display_name: "You",
      avatar_path: null,
      role: null,
      frame_id: null,
    };
    const optimisticMessage: Message = {
      id: messageId,
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      profiles: ownProfile,
      message_reactions: [],
      delivery: "sending",
    };
    if (!isDm) pendingMessagesRef.current.set(messageId, { roomId: activeRoom, message: optimisticMessage });
    const rollbackOptimisticMessage = () => {
      pendingMessagesRef.current.delete(messageId);
      setMessages((current) => {
        const next = current.filter((message) => message.id !== messageId);
        if (isDm) saveLocalDmMessages(currentUserId, activeRoom, next);
        return next;
      });
    };
    setMessages((current) => {
      const next = [...current, optimisticMessage];
      if (isDm) saveLocalDmMessages(currentUserId, activeRoom, next);
      return next;
    });
    setInput("");
    setError("");
    setSendError("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId, room_id: activeRoom, content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && String(json.error ?? "").toLowerCase().includes("banned")) {
          rollbackOptimisticMessage();
          window.location.assign("/banned");
          return;
        }
        setSendError(json.error ?? "Could not send");
        setInput(content);
        rollbackOptimisticMessage();
        return;
      }

      if (isDm) {
        const serverMessage = json.message as Message | undefined;
        const channel = dmChannelRef.current;
        if (!serverMessage || !channel) {
          setSendError("Could not prepare the private message. Please retry.");
          setInput(content);
          rollbackOptimisticMessage();
          return;
        }
        const sent = await channel.send({ type: "broadcast", event: "message", payload: { message: serverMessage } });
        if (sent !== "ok") {
          setSendError("The other reader could not be reached. They must be online to receive a private message.");
          setInput(content);
          rollbackOptimisticMessage();
          return;
        }
        setMessages((current) => {
          const next = mergeDmMessage(current, { ...serverMessage, delivery: "sent" });
          saveLocalDmMessages(currentUserId, activeRoom, next);
          return next;
        });
      } else {
        const serverMessage = json.message as Message | undefined;
        const confirmedMessage: Message = {
          ...(serverMessage ?? optimisticMessage),
          delivery: "sent",
        };
        pendingMessagesRef.current.set(messageId, {
          roomId: activeRoom,
          message: confirmedMessage,
        });
        setMessages((current) => current.map((message) =>
          message.id === messageId ? confirmedMessage : message
        ));
      }
    } catch {
      rollbackOptimisticMessage();
      setInput(content);
      setSendError("Connection interrupted. Please retry.");
    }
  }

  async function sendPrivateAttachment(file: File) {
    const roomId = activeRoom;
    if (!roomId || activeRoomData?.room_type !== "dm") return;
    if (!dmConnected || !dmPeerOnline || !dmChannelRef.current) {
      setSendError("Both readers must be online in this conversation to transfer a file.");
      return;
    }
    const allowedType = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/i.test(file.type);
    if (!allowedType) {
      setSendError("Choose a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setSendError("Private photo and video files must be 15 MB or smaller.");
      return;
    }

    setFileBusy(true); setSendError(""); setFileProgress("Connecting direct file transfer…");
    const attachmentId = crypto.randomUUID();
    const ownProfile = messages.find((message) => message.sender_id === currentUserId)?.profiles ?? currentUserProfile ?? {
      username: "You", display_name: "You", avatar_path: null, role: null, frame_id: null,
    };
    const message: Message = {
      id: crypto.randomUUID(), content: `attachment:${attachmentId}`, message_type: "attachment",
      created_at: new Date().toISOString(), sender_id: currentUserId, profiles: ownProfile,
      message_reactions: [], delivery: "sent",
      attachment: { id: attachmentId, name: file.name.slice(0, 180), type: file.type, size: file.size },
    };
    try {
      const ensureChannel = ensureRtcDataChannelRef.current;
      if (!ensureChannel) throw new Error("Direct private file transfer is not ready. Reopen this conversation and retry.");
      const dataChannel = await ensureChannel();
      await saveDmFile(currentUserId, roomId, attachmentId, file);
      const localUrl = URL.createObjectURL(file);
      const previousUrl = attachmentUrlsRef.current[attachmentId];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      attachmentUrlsRef.current = { ...attachmentUrlsRef.current, [attachmentId]: localUrl };
      setAttachmentUrls((current) => ({ ...current, [attachmentId]: localUrl }));
      const sentMessage = await dmChannelRef.current?.send({ type: "broadcast", event: "message", payload: { message } });
      if (sentMessage !== "ok") throw new Error("The other reader could not receive the file message.");
      setMessages((current) => {
        const next = mergeDmMessage(current, message);
        saveLocalDmMessages(currentUserId, roomId, next);
        return next;
      });
      dataChannel.send(JSON.stringify({ type: "file-start", id: attachmentId, name: file.name.slice(0, 180), mimeType: file.type, size: file.size }));
      const header = new TextEncoder().encode(attachmentId);
      const chunkSize = 48 * 1024;
      for (let offset = 0; offset < file.size; offset += chunkSize) {
        if (dataChannel.readyState !== "open") throw new Error("The direct connection closed during transfer. Keep both readers online and retry.");
        while (dataChannel.bufferedAmount > 512 * 1024) await new Promise((resolve) => window.setTimeout(resolve, 40));
        const chunk = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
        const packet = new Uint8Array(header.length + chunk.length);
        packet.set(header, 0); packet.set(chunk, header.length);
        dataChannel.send(packet.buffer);
        const percent = Math.min(100, Math.floor((offset + chunk.length) / file.size * 100));
        setFileProgress(`Sending ${file.name.slice(0, 35)} · ${percent}%`);
      }
      setFileProgress("Waiting for the other reader to save the file…");
      window.setTimeout(() => setFileProgress(""), 12000);
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : "Could not send this file.");
      setFileProgress("");
    } finally {
      setFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/chat/dms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "Could not start private message"); return; }
    const conversation = json.conversation as Room;
    setCurrentUserProfile(json.currentUserProfile ?? currentUserProfile);
    setDms((prev) => [conversation, ...prev.filter((dm) => dm.id !== conversation.id)]);
    setActiveRoom(conversation.id);
    setUsername("");
    setError("");
  }

  async function changeCommunity(action: "create-community" | "create-room" | "remove", room?: Room) {
    if (action === "remove" && room && !window.confirm(`Remove ${room.name}? ${room.room_type === "server" ? "This also removes all rooms and message history inside it." : "This also removes its message history."}`)) return;
    setUpdatingRooms(true);
    setError("");
    try {
      const response = action === "remove" && room
        ? await fetch("/api/chat/communities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: room.id, room_type: room.room_type }) })
        : await fetch("/api/chat/communities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "create-community" ? { name: communityName } : { name: roomName, community_id: activeServer }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setError(json.error ?? `Request failed (${response.status})`); return; }

      if (action === "create-community") {
        const community = json.community as Room;
        const defaultRoom = json.defaultRoom as Room;
        if (!community?.id || !defaultRoom?.id) { setError("Community was created, but its rooms could not be loaded. Refresh the page."); return; }
        setRoomList((current) => [...current, community, defaultRoom]);
        setActiveServer(community.id);
        setActiveRoom(defaultRoom.id);
        setCommunityName("");
      } else if (action === "create-room") {
        const createdRoom = json.room as Room;
        if (!createdRoom?.id) { setError("Room was created, but could not be loaded. Refresh the page."); return; }
        setRoomList((current) => [...current, createdRoom]);
        setActiveRoom(createdRoom.id);
        setRoomName("");
      } else if (room) {
        const remaining = roomList.filter((item) => item.id !== room.id && !(room.room_type === "server" && item.parent_room_id === room.id));
        setRoomList(remaining);
        const nextServer = room.room_type === "server" && activeServer === room.id
          ? remaining.find((item) => item.room_type === "server")?.id ?? ""
          : activeServer;
        setActiveServer(nextServer);
        if (room.id === activeRoom || (room.room_type === "server" && activeServer === room.id)) {
          setActiveRoom(remaining.find((item) => item.room_type === "channel" && item.parent_room_id === nextServer)?.id ?? "");
        }
      }
    } catch {
      setError("The request could not reach WARS. Check your connection and retry.");
    } finally {
      setUpdatingRooms(false);
    }
  }

  async function searchGifs(query: string) {
    // GIPHY's browser API key is public by design; Vercel may override this fallback.
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "jg2HsvzHBr6RbuJRUICTLPKyyUIVPmKZ";
    if (!apiKey) {
      setGifs([]);
      setGifError("GIF search needs a GIPHY API key. Add NEXT_PUBLIC_GIPHY_API_KEY to Vercel, then redeploy.");
      return;
    }

    setGifLoading(true);
    setGifError("");
    try {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 50) {
        setGifs([]);
        setGifError("GIPHY search terms must be 50 characters or fewer.");
        return;
      }
      const endpoint = trimmedQuery ? "search" : "trending";
      const params = new URLSearchParams({ api_key: apiKey, limit: "24", rating: "pg-13" });
      if (trimmedQuery) params.set("q", trimmedQuery);
      const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as {
        data?: Array<{
          id: string;
          title?: string;
          url?: string;
          images?: { fixed_width?: { url?: string } };
          user?: { username?: string; profile_url?: string };
        }>;
      };
      if (!res.ok) {
        setGifs([]);
        setGifError(res.status === 429
          ? "GIPHY search is busy. Wait a moment and try again."
          : res.status === 401 || res.status === 403
            ? "GIPHY rejected the API key. Check Vercel's NEXT_PUBLIC_GIPHY_API_KEY and redeploy."
            : "GIPHY search is temporarily unavailable.");
        return;
      }
      const results: Gif[] = (json.data ?? []).flatMap((gif) => {
        const preview = gif.images?.fixed_width?.url;
        if (!gif.id || !preview) return [];
        return [{
          id: gif.id,
          title: gif.title ?? "GIF",
          preview,
          pageUrl: gif.url ?? null,
          username: gif.user?.username ?? null,
          userProfileUrl: gif.user?.profile_url ?? null,
        }];
      });
      setGifs(results);
      if (results.length === 0) setGifError("No GIFs found. Try another search.");
    } catch {
      setGifError("Could not reach GIF search. Check your connection and retry.");
    } finally {
      setGifLoading(false);
    }
  }

  async function sendGif(gifOrUrl: Gif | string) {
    if (!activeRoom) return;
    const content = typeof gifOrUrl === "string" ? gifOrUrl : giphyMessageContent(gifOrUrl);
    const isDm = activeRoomData?.room_type === "dm";
    if (isDm && (!dmConnected || !dmChannelRef.current)) {
      setSendError("Connect to the live private-message relay before sending.");
      return;
    }
    if (isDm && !dmPeerOnline) {
      setSendError("The other reader is offline. Messages aren’t queued for later delivery.");
      return;
    }
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: activeRoom, content, message_type: "image" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (res.status === 403 && String(json.error ?? "").toLowerCase().includes("banned")) {
        window.location.assign("/banned");
        return;
      }
      setGifError(json.error ?? "Could not send GIF");
    } else if (isDm) {
      const json = await res.json().catch(() => ({}));
      const message = json.message as Message | undefined;
      if (!message || !dmChannelRef.current) { setSendError("Could not prepare the private message."); return; }
      const sent = await dmChannelRef.current.send({ type: "broadcast", event: "message", payload: { message } });
      if (sent !== "ok") { setSendError("The other reader must be online to receive this private message."); return; }
      setMessages((current) => {
        const next = mergeDmMessage(current, message);
        saveLocalDmMessages(currentUserId, activeRoom, next);
        return next;
      });
      setGifOpen(false);
    } else {
      setGifOpen(false);
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

  function insertEmoji(emoji: string) {
    const inputElement = messageInputRef.current;
    const start = inputElement?.selectionStart ?? input.length;
    const end = inputElement?.selectionEnd ?? start;
    setInput((current) => current.slice(0, start) + emoji + current.slice(end));
    setEmojiOpen(false);
    window.requestAnimationFrame(() => {
      if (!inputElement) return;
      const cursor = start + emoji.length;
      inputElement.focus();
      inputElement.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className={`flex min-h-0 ${privateMessagesOnly ? "h-[calc(100dvh-64px)]" : "h-[calc(100vh-64px)]"}`}>
      {/* Servers */}
      {!privateMessagesOnly && <nav
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
      </nav>}

      {/* Channels */}
      {privateMessagesOnly ? (
        <aside className={`${activeRoom ? "hidden" : "flex"} w-full shrink-0 flex-col overflow-y-auto border-r border-line bg-panel p-4 sm:flex sm:w-72`}>
          <h2 className="font-heading text-lg font-semibold">AniChat</h2>
          <p className="mt-1 text-xs text-muted">Private messages with readers and moderators.</p>
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted">Start a conversation</h3>
            <form className="mt-2 flex gap-2" onSubmit={startDm}>
              <input className="min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Member username" aria-label="Member username" />
              <button className="rounded-lg bg-accent px-3 text-sm font-semibold text-[#171a11]" type="submit" aria-label="Start private message">+</button>
            </form>
            <p className="mt-2 px-1 text-[11px] text-muted">Owner, Codester, Admin, and Editor accounts can only be contacted through Feedback.</p>
          </div>
          {error && <p className="mt-3 text-xs text-pink" role="alert">{error}</p>}
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted">Conversations</h3>
            {dms.length === 0 ? (
              <p className="px-1 py-4 text-sm text-muted">No private messages yet. Start one with a username above.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {dms.map((dm) => (
                  <li key={dm.id}>
                    <button type="button" onClick={() => setActiveRoom(dm.id)} aria-current={activeRoom === dm.id} className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${activeRoom === dm.id ? "bg-panel2 text-foreground" : "text-muted hover:bg-panel2 hover:text-foreground"}`}>
                      <span className="block truncate text-sm font-medium">{dm.name}</span>
                      {dm.username && <span className="block truncate text-xs text-muted">@{dm.username}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      ) : <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-line bg-panel p-2 sm:block">
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
          <form className="space-y-1 p-1" onSubmit={(e) => { e.preventDefault(); void changeCommunity("create-community"); }}><input className="w-full rounded border border-line bg-panel2 px-2 py-1 text-xs" value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="New community" disabled={updatingRooms} /><button className="w-full rounded bg-panel2 py-1 text-xs disabled:opacity-50" type="submit" disabled={updatingRooms}>{updatingRooms ? "Saving…" : "Create community"}</button></form>
          {activeServer && <form className="space-y-1 p-1" onSubmit={(e) => { e.preventDefault(); void changeCommunity("create-room"); }}><input className="w-full rounded border border-line bg-panel2 px-2 py-1 text-xs" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room in selected community" disabled={updatingRooms} /><button className="w-full rounded bg-panel2 py-1 text-xs disabled:opacity-50" type="submit" disabled={updatingRooms}>{updatingRooms ? "Saving…" : "Create room"}</button></form>}
          {error && <p className="px-2 py-1 text-xs text-pink" role="alert">{error}</p>}
          {servers.filter((server) => server.slug !== "general-chat").map((server) => <button key={server.id} className="block px-2 py-1 text-left text-[10px] text-pink" onClick={() => void changeCommunity("remove", server)} type="button">Remove {server.name}</button>)}
          {serverChannels.filter((channel) => channel.slug !== "general-chat-general").map((channel) => <button key={channel.id} className="block px-2 py-1 text-left text-[10px] text-pink" onClick={() => void changeCommunity("remove", channel)} type="button">Remove #{channel.name}</button>)}
        </div>}
      </aside>}

      {/* Messages */}
      <div className={`${privateMessagesOnly && !activeRoom ? "hidden sm:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col bg-background`}>
        <header className="border-b border-line px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {privateMessagesOnly && activeRoom && <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-muted sm:hidden" aria-label="Back to conversations" onClick={() => setActiveRoom("")}><ArrowLeft className="h-4 w-4" /></button>}
              <h1 className="truncate font-heading text-sm font-semibold">{privateMessagesOnly ? (activeRoom ? activeRoomName : "AniChat") : activeRoomData?.room_type === "dm" ? `@ ${activeRoomName}` : `# ${activeRoomName}`}</h1>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-muted"><span className={`h-1.5 w-1.5 rounded-full ${activeRoomData?.room_type === "dm" ? (dmConnected && dmPeerOnline ? "bg-emerald-400" : "bg-amber-400") : "bg-emerald-400"}`} />{activeRoomData?.room_type === "dm" ? (dmConnected ? (dmPeerOnline ? "Reader online" : "Waiting for reader") : "Connecting…") : "Live updates"}</span>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {activeRoom && loading && messages.length === 0 && <p className="text-sm text-muted">Loading messages…</p>}
          {!activeRoom && !loading && <p className={`text-sm ${roomsError ? "text-pink" : "text-muted"}`} role={roomsError ? "alert" : undefined}>{privateMessagesOnly ? "Select a conversation or start a new one from the list." : roomsError ?? "No chat rooms are available yet. Try refreshing the page."}</p>}
          {activeRoom && !loading && messages.length === 0 && !error && <p className="text-sm text-muted">No messages yet. Start the conversation.</p>}
          {messages.map((message) => {
            const grouped = new Map<string, number>();
            (message.message_reactions ?? []).forEach((r) =>
              grouped.set(r.reaction, (grouped.get(r.reaction) ?? 0) + 1)
            );
            const username = message.profiles?.username;
            const displayName = message.profiles?.display_name || username || "Reader";
            const profileHref = username ? `/dashboard/${encodeURIComponent(username)}` : null;
            return (
              <div key={message.id} className="group">
                <div className="flex flex-wrap items-center gap-2">
                  {profileHref ? (
                    <Link href={profileHref} aria-label={`Visit ${displayName}'s dashboard`} className="inline-flex items-center gap-2 rounded-md outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent">
                      <ProfileAvatar
                        userId={message.sender_id}
                        avatarPath={message.profiles?.avatar_path}
                        name={displayName}
                        role={message.profiles?.role}
                        frameId={message.profiles?.frame_id}
                        size={24}
                      />
                      <RoleName role={message.profiles?.role} className="role-name-glow text-[12px] font-semibold">
                        {displayName}
                      </RoleName>
                    </Link>
                  ) : (
                    <>
                      <ProfileAvatar
                        userId={message.sender_id}
                        avatarPath={message.profiles?.avatar_path}
                        name={displayName}
                        role={message.profiles?.role}
                        frameId={message.profiles?.frame_id}
                        size={24}
                      />
                      <RoleName role={message.profiles?.role} className="role-name-glow text-[12px] font-semibold">
                        {displayName}
                      </RoleName>
                    </>
                  )}
                  {(message.profiles?.roles?.length
                    ? message.profiles.roles
                    : message.profiles?.role
                      ? [message.profiles.role]
                      : []
                  ).map((role) => <RoleBadge key={role} role={role} />)}
                  <time className="text-[10px] text-muted">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {message.delivery === "sending" && <span className="text-[10px] text-muted">Sending…</span>}
                </div>
                {message.message_type === "attachment" && message.attachment ? (
                  <div className="mt-1 max-w-full overflow-hidden rounded-lg border border-line bg-panel2" style={{ width: "min(100%, 420px)" }}>
                    {attachmentUrls[message.attachment.id] ? message.attachment.type.startsWith("video/") ? (
                      <video src={attachmentUrls[message.attachment.id]} controls playsInline preload="metadata" className="max-h-80 w-full bg-black" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachmentUrls[message.attachment.id]} alt={message.attachment.name} className="max-h-80 w-full bg-black object-contain" />
                    ) : <p className="px-3 py-4 text-xs text-muted">Waiting for the live file transfer…</p>}
                    <p className="truncate px-3 py-2 text-[11px] text-muted">{message.attachment.name} · {(message.attachment.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : message.message_type === "image" ? (() => {
                  const giphy = parseGiphyMessage(message.content);
                  const creatorUrl = safeExternalUrl(giphy?.userProfileUrl ?? null);
                  const pageUrl = safeExternalUrl(giphy?.pageUrl ?? null);
                  return giphy ? (
                    <div className="mt-1 w-fit max-w-full">
                      <iframe
                        src={`https://giphy.com/embed/${encodeURIComponent(giphy.id)}`}
                        title="GIPHY animation"
                        loading="lazy"
                        allowFullScreen
                        className="h-56 max-w-full rounded-lg border-0"
                        width="320"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
                        <span className="text-[10px] text-muted">
                          {creatorUrl && giphy.username ? <>GIF by <a href={creatorUrl} target="_blank" rel="noreferrer" className="underline">{giphy.username}</a>{" · "}</> : null}
                          {pageUrl && <a href={pageUrl} target="_blank" rel="noreferrer" className="underline">View on GIPHY</a>}
                        </span>
                        <a href="https://giphy.com" target="_blank" rel="noreferrer" aria-label="Powered by GIPHY">
                          <Image src={giphyPoweredBy} alt="Powered by GIPHY" width={100} height={21} unoptimized />
                        </a>
                      </div>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.content} alt="GIF" loading="lazy" className="mt-1 max-h-56 rounded-lg" />
                  );
                })() : (
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                    {message.content}
                  </p>
                )}
                {activeRoomData?.room_type !== "dm" && <div className="mt-1 flex items-center gap-1">
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
                </div>}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {emojiOpen && (
          <div className="border-t border-line bg-panel p-3" aria-label="Emoji picker">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Choose an emoji</p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
              {CHAT_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="rounded-md p-1.5 text-lg transition-colors hover:bg-panel2 focus:bg-panel2" aria-label={`Add ${emoji}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        {gifOpen && (
          <div className="border-t border-line bg-panel p-3">
            <div className="flex gap-2">
              <input
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchGifs(gifQuery);
                  }
                }}
                placeholder="Search GIPHY or paste a direct image link"
                aria-label="Search GIPHY or paste an image link"
                className="min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-3 py-1.5 text-xs outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => void searchGifs(gifQuery)}
                disabled={gifLoading}
                className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {gifLoading ? "Searching…" : "Search"}
              </button>
              {isDirectImageUrl(gifQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => void sendGif(gifQuery.trim())}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#171a11]"
                >
                  Send link
                </button>
              )}
            </div>
            {gifError && <p className="mt-2 text-xs text-pink" role="status">{gifError}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted">GIFs by GIPHY</span>
              <a href="https://giphy.com" target="_blank" rel="noreferrer" aria-label="Powered by GIPHY">
                <Image src={giphyPoweredBy} alt="Powered by GIPHY" width={100} height={21} unoptimized />
              </a>
            </div>
            <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {gifs.map((gif) => {
                const creatorUrl = safeExternalUrl(gif.userProfileUrl);
                return (
                  <div key={gif.id} className="min-w-0 overflow-hidden rounded-md border border-line">
                    <button
                      type="button"
                      onClick={() => void sendGif(gif)}
                      className="block w-full hover:ring-1 hover:ring-accent"
                      aria-label={`Send ${gif.title || "GIF"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gif.preview} alt={gif.title} loading="lazy" className="h-16 w-full object-cover" />
                    </button>
                    {gif.username && creatorUrl && (
                      <a href={creatorUrl} target="_blank" rel="noreferrer" className="block truncate px-1 py-0.5 text-[9px] text-muted underline">
                        by {gif.username}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeRoomData?.room_type === "dm" && (
          <p className="border-t border-line px-3 pt-2 text-[10px] text-muted">
            Private history and files stay in this browser. Files transfer directly between online readers; they aren’t stored on WARS servers.
          </p>
        )}
        <form onSubmit={send} className="border-t border-line p-3">
          {(sendError || error) && <p className="mb-1.5 text-[11px] text-pink" role="alert">{sendError || error}</p>}
          {fileProgress && <p className="mb-1.5 text-[11px] text-muted" role="status">{fileProgress}</p>}
          <div className="flex items-center gap-2">
            {activeRoomData?.room_type === "dm" && <>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="sr-only" aria-label="Choose a photo or video" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void sendPrivateAttachment(selected); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!activeRoom || !dmConnected || !dmPeerOnline || fileBusy} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-foreground disabled:opacity-50" aria-label="Attach photo or video" title="Send a photo or video directly to the online reader"><Paperclip className="h-4 w-4" /></button>
            </>}
            <button
              type="button"
              onClick={() => {
                setGifOpen((v) => !v);
                setEmojiOpen(false);
                if (!gifOpen && gifs.length === 0) void searchGifs("");
              }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-foreground"
              aria-label="Toggle GIF search"
              aria-expanded={gifOpen}
            >
              <ImagePlay className="h-4 w-4" />
            </button>
            <input
              ref={messageInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
              placeholder={activeRoom ? `${activeRoomData?.room_type === "dm" ? "Message @" : "Message #"}${activeRoomName}` : "No chat room selected"}
              aria-label="Message"
              disabled={!activeRoom || (activeRoomData?.room_type === "dm" && !dmConnected)}
              className="flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => {
                setEmojiOpen((open) => !open);
                setGifOpen(false);
              }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-foreground"
              aria-label="Toggle emoji picker"
              aria-expanded={emojiOpen}
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || !activeRoom || (activeRoomData?.room_type === "dm" && (!dmConnected || !dmPeerOnline))}
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
