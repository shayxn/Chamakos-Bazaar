/* @refresh reset */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Send, Smile, X, Users, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ─────────────────────────────────────────────────────────────────────
type ChatMessage = {
  id?: number; senderId: string; senderName: string; message: string;
  type: string; metadata?: string | null; reactions: Record<string, string[]>;
  readBy: string[]; createdAt: string; _pending?: boolean;
};
type OnlineAdmin = { adminId: string; adminName: string };
type CallState = "idle" | "calling" | "receiving" | "in-call";

// ── Constants ─────────────────────────────────────────────────────────────────
const EMOJIS = ["🔥", "👍", "❤️", "😂", "⚡", "💪", "✅", "🚀"];
const AVATAR_COLORS = ["#ff6600", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

function getAvatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, size = 36, color }: { name: string; size?: number; color?: string }) {
  const bg = color ?? getAvatarColor(name);
  return (
    <div style={{ width: size, height: size, background: bg, fontSize: size * 0.38, flexShrink: 0 }}
      className="rounded-full flex items-center justify-center font-black text-white uppercase select-none">
      {name.slice(0, 2)}
    </div>
  );
}

// ── STUN servers for WebRTC ───────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function AdminChatPage() {
  const { toast } = useToast();

  // Admin identity
  const [adminId] = useState(() => {
    let id = localStorage.getItem("fp_admin_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("fp_admin_id", id); }
    return id;
  });
  const [adminName] = useState(() => localStorage.getItem("fp_admin_name") ?? "Admin");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showReactFor, setShowReactFor] = useState<number | null>(null);
  const [typingAdmins, setTypingAdmins] = useState<string[]>([]);

  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callPeer, setCallPeer] = useState<OnlineAdmin | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load history
  useEffect(() => {
    fetch(`${BASE}/api/admin/chat/messages`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(setMessages).catch(() => {});
  }, []);

  // SSE connection
  useEffect(() => {
    const name = encodeURIComponent(adminName);
    const url = `${BASE}/api/admin/chat/stream?adminId=${adminId}&adminName=${name}`;
    const es = new EventSource(url, { withCredentials: true });
    sseRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as Record<string, unknown>;
      if (data.type === "MESSAGE") {
        const msg = data.message as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else if (data.type === "PRESENCE") {
        setOnlineAdmins((data.onlineAdmins as OnlineAdmin[]) ?? []);
      } else if (data.type === "REACTION") {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions as Record<string, string[]> } : m));
      } else if (data.type === "TYPING") {
        const typer = data.adminName as string;
        if (data.typing) {
          setTypingAdmins(prev => prev.includes(typer) ? prev : [...prev, typer]);
        } else {
          setTypingAdmins(prev => prev.filter(t => t !== typer));
        }
      } else if (data.type === "WEBRTC_SIGNAL") {
        handleSignal(data.from as string, data.fromName as string, data.signal as RTCSessionDescriptionInit | RTCIceCandidateInit);
      }
    };

    return () => { es.close(); };
  }, [adminId, adminName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Call timer
  useEffect(() => {
    if (callState === "in-call") {
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [callState]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setSending(true);
    const optimistic: ChatMessage = {
      senderId: adminId, senderName: adminName, message: msg,
      type: "text", reactions: {}, readBy: [adminId], createdAt: new Date().toISOString(), _pending: true
    };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    try {
      const res = await fetch(`${BASE}/api/admin/chat/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: adminId, senderName: adminName, message: msg }),
      });
      const saved = await res.json() as ChatMessage;
      setMessages(prev => prev.filter(m => !m._pending).concat([saved]));
    } catch {
      setMessages(prev => prev.filter(m => !m._pending));
      toast({ title: "Failed to send", variant: "destructive" });
    } finally { setSending(false); }
  }, [input, sending, adminId, adminName, toast]);

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const broadcastTyping = (typing: boolean) => {
    fetch(`${BASE}/api/admin/chat/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: adminId, senderName: adminName, message: "__TYPING__", type: `typing_${typing}` }),
    }).catch(() => {});
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    broadcastTyping(true);
    typingTimerRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  // ── React to message ─────────────────────────────────────────────────────────
  const reactToMessage = async (msgId: number, emoji: string) => {
    setShowReactFor(null);
    await fetch(`${BASE}/api/admin/chat/messages/${msgId}/react`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, emoji }),
    });
  };

  // ── WebRTC ───────────────────────────────────────────────────────────────────
  const signal = useCallback(async (to: string, data: unknown) => {
    await fetch(`${BASE}/api/admin/chat/signal`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, from: adminId, fromName: adminName, signal: data }),
    });
  }, [adminId, adminName]);

  const endCall = useCallback(() => {
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle"); setCallPeer(null); setMuted(false); setVideoOff(false);
  }, []);

  const createPeer = useCallback(async (initiator: boolean, targetId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() =>
      navigator.mediaDevices.getUserMedia({ audio: true })
    );
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) signal(targetId, { type: "ice-candidate", candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallState("in-call");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") endCall();
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(targetId, { type: "offer", offer });
    }

    return pc;
  }, [signal, endCall]);

  const startCall = async (peer: OnlineAdmin) => {
    if (callState !== "idle") return;
    setCallState("calling");
    setCallPeer(peer);
    await createPeer(true, peer.adminId);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setCallState("in-call");
    setCallPeer({ adminId: incomingCall.from, adminName: incomingCall.fromName });
    const pc = await createPeer(false, incomingCall.from);
    await pc.setRemoteDescription(incomingCall.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await signal(incomingCall.from, { type: "answer", answer });
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    signal(incomingCall.from, { type: "declined" });
    setIncomingCall(null);
    setCallState("idle");
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; });
    setVideoOff(v => !v);
  };

  const handleSignal = useCallback(async (from: string, fromName: string, sig: RTCSessionDescriptionInit | RTCIceCandidateInit | { type: string }) => {
    if ((sig as { type: string }).type === "offer") {
      const offerSig = sig as { type: "offer"; offer: RTCSessionDescriptionInit };
      setIncomingCall({ from, fromName, offer: offerSig.offer });
      setCallState("receiving");
    } else if ((sig as { type: string }).type === "answer" && pcRef.current) {
      const answerSig = sig as { type: "answer"; answer: RTCSessionDescriptionInit };
      await pcRef.current.setRemoteDescription(answerSig.answer);
      setCallState("in-call");
    } else if ((sig as { type: string }).type === "ice-candidate" && pcRef.current) {
      const iceSig = sig as { type: "ice-candidate"; candidate: RTCIceCandidateInit };
      await pcRef.current.addIceCandidate(iceSig.candidate).catch(() => {});
    } else if ((sig as { type: string }).type === "declined") {
      endCall();
      toast({ title: "Call declined" });
    }
  }, [endCall, toast]);

  const copyInviteLink = () => {
    const base = window.location.href.replace(/\/admin.*/, "/admin/chat");
    navigator.clipboard.writeText(base).catch(() => {});
    setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000);
  };

  const otherAdmins = onlineAdmins.filter(a => a.adminId !== adminId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ background: "rgba(0,0,0,0.4)" }}>

      {/* ── Incoming call overlay ── */}
      <AnimatePresence>
        {incomingCall && callState === "receiving" && (
          <motion.div initial={{ opacity: 0, scale: 0.85, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: -20 }}
            className="fixed top-6 right-6 z-[100] rounded-2xl border border-white/15 p-5 w-72 shadow-2xl"
            style={{ background: "rgba(20,20,20,0.98)", backdropFilter: "blur(40px)" }}>
            <button onClick={declineCall} className="absolute top-3 right-3 text-muted-foreground hover:text-white"><X className="h-4 w-4" /></button>
            <p className="text-xs font-bold text-muted-foreground mb-3">Incoming Call...</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Avatar name={incomingCall.fromName} size={48} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background animate-pulse" />
              </div>
              <div>
                <p className="font-black text-base">{incomingCall.fromName}</p>
                <p className="text-xs text-muted-foreground">Admin Group is calling…</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={declineCall} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2">
                <PhoneOff className="h-4 w-4" /> Decline
              </button>
              <button onClick={acceptCall} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" /> Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active call UI ── */}
      <AnimatePresence>
        {(callState === "calling" || callState === "in-call") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden"
              style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(40px)" }}>

              {/* Video area */}
              <div className="relative aspect-video bg-black">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {callState === "calling" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <Avatar name={callPeer?.adminName ?? "?"} size={80} />
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full bg-primary/30" />
                    </div>
                    <p className="font-black text-xl">{callPeer?.adminName}</p>
                    <p className="text-muted-foreground text-sm animate-pulse">Calling…</p>
                  </div>
                )}
                {/* Local video PiP */}
                <div className="absolute top-4 right-4 w-32 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                {/* Duration */}
                {callState === "in-call" && (
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono font-black text-primary">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6">
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {callState === "in-call" ? `In call with ${callPeer?.adminName}` : "Connecting…"}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-600 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOff ? "bg-red-600 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                    {videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                  <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors">
                    <PhoneOff className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Members sidebar ── */}
      <AnimatePresence>
        {showMembers && (
          <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute right-0 top-0 h-full w-72 border-l border-white/8 flex flex-col z-20"
            style={{ background: "rgba(8,8,8,0.97)", backdropFilter: "blur(30px)" }}>
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <p className="font-black uppercase tracking-widest text-xs">Members ({onlineAdmins.length})</p>
              <button onClick={() => setShowMembers(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            {/* Invite link */}
            <div className="p-4 border-b border-white/8">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Group Invite Link</p>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-3">
                <p className="text-xs text-muted-foreground flex-1 truncate">{window.location.href.replace(/\/admin.*/, "/admin/chat")}</p>
                <button onClick={copyInviteLink} className="shrink-0 text-primary hover:opacity-70">
                  {inviteCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {onlineAdmins.map(a => (
                <div key={a.adminId} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={a.adminName} size={36} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{a.adminName}</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                  {a.adminId !== adminId && (
                    <button onClick={() => startCall(a)} className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center transition-colors">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-black text-sm">Admin Group</p>
            <p className="text-[11px] text-green-400">{onlineAdmins.length > 0 ? `${onlineAdmins.length} member${onlineAdmins.length !== 1 ? "s" : ""} online` : "Connecting…"}</p>
          </div>
          <div className="flex items-center gap-2">
            {otherAdmins.slice(0, 1).map(peer => (
              <button key={peer.adminId} onClick={() => startCall(peer)} title={`Call ${peer.adminName}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold transition-colors">
                <Phone className="h-3.5 w-3.5" /> Call
              </button>
            ))}
            <button onClick={() => setShowMembers(s => !s)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Members
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {messages.filter(m => !m.message.startsWith("__TYPING__") && m.type !== "typing_true" && m.type !== "typing_false").map((msg, idx) => {
            const isMe = msg.senderId === adminId;
            const allVisible = messages.filter(m => !m.message.startsWith("__TYPING__") && m.type !== "typing_true" && m.type !== "typing_false");
            const showAvatar = !isMe && (idx === 0 || allVisible[idx - 1]?.senderId !== msg.senderId);
            return (
              <motion.div key={msg.id ?? `pending-${idx}`}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: msg._pending ? 0.7 : 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="w-7 shrink-0 mb-1">
                    {showAvatar && <Avatar name={msg.senderName} size={28} />}
                  </div>
                )}
                <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {showAvatar && !isMe && <p className="text-[10px] font-bold text-muted-foreground pl-1">{msg.senderName}</p>}
                  <div className="relative group">
                    <div onClick={() => setShowReactFor(showReactFor === (msg.id ?? null) ? null : (msg.id ?? null))}
                      className={`px-3.5 py-2.5 rounded-2xl text-sm cursor-pointer select-none ${isMe
                        ? "rounded-br-sm bg-primary text-white"
                        : "rounded-bl-sm border border-white/10 text-white"
                      }`}
                      style={isMe ? {} : { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)" }}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    {/* Reactions display */}
                    {Object.keys(msg.reactions ?? {}).length > 0 && (
                      <div className={`absolute -bottom-3 flex gap-0.5 ${isMe ? "right-1" : "left-1"}`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
                          <button key={emoji} onClick={() => msg.id && reactToMessage(msg.id, emoji)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border text-white flex items-center gap-0.5 ${users.includes(adminId) ? "border-primary/50 bg-primary/20" : "border-white/10 bg-white/5"}`}>
                            {emoji} {users.length > 1 && <span className="font-bold">{users.length}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] text-muted-foreground/60 px-1 ${isMe ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
          {/* Typing indicator */}
          {typingAdmins.filter(n => n !== adminName).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 pl-9">
              <div className="flex gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-white/10" style={{ background: "rgba(255,255,255,0.06)" }}>
                {[0,1,2].map(i => <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />)}
              </div>
              <p className="text-[10px] text-muted-foreground">{typingAdmins.filter(n => n !== adminName)[0]} is typing…</p>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-2">
              <div className="flex gap-2 p-3 rounded-2xl border border-white/10 flex-wrap"
                style={{ background: "rgba(15,15,15,0.95)", backdropFilter: "blur(20px)" }}>
                {["😀","😂","❤️","🔥","👍","🚀","⚡","💪","✅","🎉","😎","🤝","💯","🙏","🛍️","📦"].map(e => (
                  <button key={e} onClick={() => { setInput(i => i + e); setShowEmoji(false); }}
                    className="text-xl hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji reactions picker for messages */}
        <AnimatePresence>
          {showReactFor !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex gap-2 p-3 rounded-2xl border border-white/15 shadow-2xl"
              style={{ background: "rgba(15,15,15,0.98)", backdropFilter: "blur(30px)" }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => showReactFor !== null && reactToMessage(showReactFor, e)}
                  className="text-2xl hover:scale-125 transition-transform w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10">
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-2 border-t border-white/8"
          style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(15px)" }}>
            <button onClick={() => setShowEmoji(s => !s)} className="text-muted-foreground hover:text-white transition-colors">
              <Smile className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-primary hover:opacity-90 disabled:opacity-30 flex items-center justify-center transition-all shrink-0">
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
