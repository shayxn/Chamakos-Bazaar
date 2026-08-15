/* @refresh reset */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Send, Smile, X, Users, Copy, Check, Bell, BellOff, PhoneCall, PhoneIncoming, Volume2, VolumeX, Maximize2 } from "lucide-react";
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
const QUICK_EMOJIS = ["😀","😂","❤️","🔥","👍","🚀","⚡","💪","✅","🎉","😎","🤝","💯","🙏","🛍️","📦"];
const AVATAR_COLORS = ["#ff6600", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

function getAvatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Glass style helpers ───────────────────────────────────────────────────────
const GLASS = {
  card: { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" },
  dark: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" },
  panel: { background: "rgba(8,8,12,0.88)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" },
  header: { background: "rgba(15,15,20,0.75)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" },
  input: { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  sidebar: { background: "rgba(5,5,10,0.95)", backdropFilter: "blur(50px)", WebkitBackdropFilter: "blur(50px)" },
};

// ── Sound effects via Web Audio API ──────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

function playTypingClick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.035);
  } catch {}
}

function playSentSound() {
  try {
    const ctx = getCtx();
    [0, 0.06].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(i === 0 ? 600 : 900, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.07, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {}
}

function playReceivedSound() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
  } catch {}
}

let _ringOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
function startRingTone() {
  try {
    stopRingTone();
    const ctx = getCtx();
    function ring() {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
      _ringOscillators.push({ osc, gain });
    }
    ring();
    const id = setInterval(ring, 1800);
    (_audioCtx as any)._ringInterval = id;
  } catch {}
}
function stopRingTone() {
  try {
    _ringOscillators.forEach(({ osc, gain }) => { try { gain.gain.setValueAtTime(0, getCtx().currentTime); osc.stop(); } catch {} });
    _ringOscillators = [];
    if ((_audioCtx as any)?._ringInterval) { clearInterval((_audioCtx as any)._ringInterval); delete (_audioCtx as any)._ringInterval; }
  } catch {}
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, color, ring }: { name: string; size?: number; color?: string; ring?: boolean }) {
  const bg = color ?? getAvatarColor(name);
  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
      {ring && (
        <motion.div animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${bg}`, pointerEvents: "none" }} />
      )}
      <div style={{ width: size, height: size, background: bg, fontSize: size * 0.38, borderRadius: "50%" }}
        className="flex items-center justify-center font-black text-white uppercase select-none shadow-lg">
        {name.slice(0, 2)}
      </div>
    </div>
  );
}

// ── VAPID helper ──────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── ICE servers ───────────────────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// ── Main chat page ─────────────────────────────────────────────────────────────
export default function AdminChatPage() {
  const { toast } = useToast();

  // Identity
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
  const prevMsgCountRef = useRef(0);

  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callPeer, setCallPeer] = useState<OnlineAdmin | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [callMaximized, setCallMaximized] = useState(false);

  // UI state
  const [showMembers, setShowMembers] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem("fp_admin_push") === "1");
  const [pushLoading, setPushLoading] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingClickThrottleRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history
  useEffect(() => {
    fetch(`${BASE}/api/admin/chat/messages`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then((msgs: ChatMessage[]) => {
        setMessages(msgs);
        prevMsgCountRef.current = msgs.length;
      }).catch(() => {});
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
          const next = [...prev, msg];
          // Play received sound only for messages from others
          if (msg.senderId !== adminId) {
            playReceivedSound();
          }
          return next;
        });
      } else if (data.type === "PRESENCE") {
        setOnlineAdmins((data.onlineAdmins as OnlineAdmin[]) ?? []);
      } else if (data.type === "REACTION") {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions as Record<string, string[]> } : m));
      } else if (data.type === "TYPING") {
        const typer = data.adminName as string;
        if (data.typing) setTypingAdmins(prev => prev.includes(typer) ? prev : [...prev, typer]);
        else setTypingAdmins(prev => prev.filter(t => t !== typer));
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

  // Incoming call ring
  useEffect(() => {
    if (callState === "receiving") { startRingTone(); }
    else { stopRingTone(); }
    return () => { stopRingTone(); };
  }, [callState]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setSending(true);
    playSentSound();
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

  // ── Typing indicator ──────────────────────────────────────────────────────────
  const broadcastTyping = (typing: boolean) => {
    fetch(`${BASE}/api/admin/chat/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: adminId, senderName: adminName, message: "__TYPING__", type: `typing_${typing}` }),
    }).catch(() => {});
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    // Throttled typing click sound
    const now = Date.now();
    if (now - typingClickThrottleRef.current > 80) {
      typingClickThrottleRef.current = now;
      playTypingClick();
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    broadcastTyping(true);
    typingTimerRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  // ── Reactions ─────────────────────────────────────────────────────────────────
  const reactToMessage = async (msgId: number, emoji: string) => {
    setShowReactFor(null);
    await fetch(`${BASE}/api/admin/chat/messages/${msgId}/react`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, emoji }),
    });
  };

  // ── WebRTC ────────────────────────────────────────────────────────────────────
  const signal = useCallback(async (to: string | null, data: unknown, broadcast?: boolean) => {
    await fetch(`${BASE}/api/admin/chat/signal`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to ?? undefined, from: adminId, fromName: adminName, signal: data, broadcast: broadcast ?? false }),
    });
  }, [adminId, adminName]);

  const endCall = useCallback(() => {
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle"); setCallPeer(null); setMuted(false); setVideoOff(false); setCallMaximized(false);
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
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => { if (e.candidate) signal(targetId, { type: "ice-candidate", candidate: e.candidate }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallState("in-call");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") endCall();
    };
    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(null, { type: "offer", offer }, true); // broadcast to ALL admins
    }
    return pc;
  }, [signal, endCall]);

  // Group call — rings ALL online admins
  const startGroupCall = async () => {
    if (callState !== "idle") return;
    const others = onlineAdmins.filter(a => a.adminId !== adminId);
    if (others.length === 0) { toast({ title: "No other admins online" }); return; }
    setCallState("calling");
    setCallPeer({ adminId: "group", adminName: "Admin Group" });
    await createPeer(true, "broadcast"); // backend handles broadcast
  };

  const startCall = async (peer: OnlineAdmin) => {
    if (callState !== "idle") return;
    setCallState("calling");
    setCallPeer(peer);
    const pc = await createPeer(false, peer.adminId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await signal(peer.adminId, { type: "offer", offer });
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
    setIncomingCall(null); setCallState("idle");
  };

  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
  const toggleVideo = () => { localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; }); setVideoOff(v => !v); };

  const handleSignal = useCallback(async (from: string, fromName: string, sig: RTCSessionDescriptionInit | RTCIceCandidateInit | { type: string }) => {
    const t = (sig as { type: string }).type;
    if (t === "offer") {
      const offerSig = sig as { type: "offer"; offer: RTCSessionDescriptionInit };
      setIncomingCall({ from, fromName, offer: offerSig.offer });
      setCallState("receiving");
    } else if (t === "answer" && pcRef.current) {
      await pcRef.current.setRemoteDescription((sig as { type: "answer"; answer: RTCSessionDescriptionInit }).answer);
      setCallState("in-call");
    } else if (t === "ice-candidate" && pcRef.current) {
      await pcRef.current.addIceCandidate((sig as { type: "ice-candidate"; candidate: RTCIceCandidateInit }).candidate).catch(() => {});
    } else if (t === "declined") {
      endCall(); toast({ title: "Call declined" });
    }
  }, [endCall, toast]);

  // ── Push subscribe (admin chat notifications) ─────────────────────────────────
  const subscribePush = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast({ title: "Notifications blocked" }); return; }
      const vapidRes = await fetch(`${BASE}/api/push/vapid-public-key`, { credentials: "include" });
      if (!vapidRes.ok) return;
      const { publicKey } = await vapidRes.json() as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource });
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch(`${BASE}/api/admin/chat/push-subscribe`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth, adminId }),
      });
      localStorage.setItem("fp_admin_push", "1");
      setPushEnabled(true);
      toast({ title: "🔔 Notifications enabled!", description: "You'll get push alerts for new messages and activities." });
    } catch (e) {
      toast({ title: "Setup failed", description: String(e), variant: "destructive" });
    } finally { setPushLoading(false); }
  };

  const copyInviteLink = () => {
    const base = window.location.href.replace(/\/admin.*/, "/admin/chat");
    navigator.clipboard.writeText(base).catch(() => {});
    setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000);
  };

  const visibleMessages = messages.filter(m => m.type === "text" && !m.message.startsWith("__TYPING__"));
  const otherAdmins = onlineAdmins.filter(a => a.adminId !== adminId);

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(10,5,15,1) 0%, rgba(5,5,10,1) 100%)" }}>

      {/* Background aurora */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, #ff6600 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.04, 0.08, 0.04] }} transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      </div>

      {/* ── Incoming call overlay ── */}
      <AnimatePresence>
        {incomingCall && callState === "receiving" && (
          <motion.div initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed top-6 right-6 z-[200] rounded-3xl border border-white/15 p-5 w-80 shadow-2xl overflow-hidden"
            style={GLASS.panel}>
            {/* Animated rings */}
            <div className="absolute inset-0 pointer-events-none">
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                  className="absolute inset-0 rounded-3xl border border-primary/30" />
              ))}
            </div>

            <button onClick={declineCall} className="absolute top-3 right-3 text-muted-foreground hover:text-white z-10">
              <X className="h-4 w-4" />
            </button>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <Avatar name={incomingCall.fromName} size={52} ring />
                  <motion.div animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background" />
                </div>
                <div>
                  <p className="font-black text-base leading-tight">{incomingCall.fromName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                      <PhoneIncoming className="h-3 w-3 text-green-400" />
                    </motion.div>
                    <p className="text-xs text-green-400 font-bold">Incoming call…</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={declineCall}
                  className="flex-1 py-3 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors">
                  <PhoneOff className="h-4 w-4" /> Decline
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={acceptCall}
                  className="flex-1 py-3 rounded-2xl bg-green-600/90 hover:bg-green-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors">
                  <Phone className="h-4 w-4" /> Accept
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active call UI ── */}
      <AnimatePresence>
        {(callState === "calling" || callState === "in-call") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed z-[100] flex items-center justify-center ${callMaximized ? "inset-0" : "bottom-20 right-6 w-80 h-auto"}`}
            style={callMaximized ? { background: "rgba(0,0,0,0.9)", backdropFilter: "blur(30px)" } : {}}>
            <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={`relative overflow-hidden ${callMaximized ? "w-full max-w-3xl rounded-3xl mx-4" : "w-full rounded-3xl"} border border-white/12 shadow-2xl`}
              style={GLASS.panel}>

              {/* Maximize toggle */}
              <button onClick={() => setCallMaximized(m => !m)}
                className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Maximize2 className="h-3.5 w-3.5 text-white/70" />
              </button>

              {/* Video area */}
              <div className={`relative bg-black ${callMaximized ? "aspect-video" : "aspect-video"}`}>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                {/* Calling state overlay */}
                {callState === "calling" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                    style={{ background: "linear-gradient(135deg, rgba(20,10,35,0.97) 0%, rgba(10,5,20,0.97) 100%)" }}>
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                      <Avatar name={callPeer?.adminName ?? "?"} size={80} ring />
                    </motion.div>
                    <p className="font-black text-xl">{callPeer?.adminName ?? "Admin Group"}</p>
                    <div className="flex items-center gap-1.5">
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.25 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                      <p className="text-muted-foreground text-sm ml-1">Calling…</p>
                    </div>
                    {/* Ripple rings */}
                    {[0,1,2].map(i => (
                      <motion.div key={i} animate={{ scale: [1, 2.5], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.8 }}
                        className="absolute w-24 h-24 rounded-full border border-primary/40" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                    ))}
                  </div>
                )}

                {/* PiP local video */}
                <motion.div drag dragConstraints={{ top: 4, left: 4, right: 4, bottom: 4 }}
                  className="absolute top-4 right-4 rounded-xl overflow-hidden border border-white/20 bg-black shadow-xl cursor-grab active:cursor-grabbing"
                  style={{ width: callMaximized ? 160 : 90, aspectRatio: "16/9" }}>
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {videoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <VideoOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>

                {/* Duration badge */}
                {callState === "in-call" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute top-4 left-12 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono font-black text-primary border border-primary/20">
                    {formatDuration(callDuration)}
                  </motion.div>
                )}
              </div>

              {/* Controls bar */}
              <div className="p-4 flex items-center justify-between" style={GLASS.dark}>
                <p className="text-xs text-muted-foreground font-bold">
                  {callState === "in-call" ? `In call with ${callPeer?.adminName ?? "Admin"}` : "Connecting…"}
                </p>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMute}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${muted ? "bg-red-600/90 border-red-500/50" : "bg-white/10 border-white/10 hover:bg-white/20"}`}>
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={toggleVideo}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${videoOff ? "bg-red-600/90 border-red-500/50" : "bg-white/10 border-white/10 hover:bg-white/20"}`}>
                    {videoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={endCall}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg shadow-red-900/50">
                    <PhoneOff className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Members sidebar ── */}
      <AnimatePresence>
        {showMembers && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMembers(false)}
              className="absolute inset-0 z-10 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="absolute right-0 top-0 h-full w-72 border-l border-white/8 flex flex-col z-20"
              style={GLASS.sidebar}>
              <div className="p-4 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="font-black uppercase tracking-widest text-xs">{onlineAdmins.length} Online</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowMembers(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>

              {/* Push notification toggle */}
              <div className="p-4 border-b border-white/8">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Notifications</p>
                <button onClick={subscribePush} disabled={pushEnabled || pushLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border
                    ${pushEnabled
                      ? "bg-green-600/15 border-green-500/30 text-green-400 cursor-default"
                      : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"}`}>
                  {pushEnabled ? <><Bell className="h-3.5 w-3.5" /> Enabled</> : pushLoading ? "Setting up…" : <><BellOff className="h-3.5 w-3.5" /> Enable Alerts</>}
                </button>
                {!pushEnabled && <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Get pinged when app is closed</p>}
              </div>

              {/* Invite link */}
              <div className="p-4 border-b border-white/8">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Invite Link</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10" style={GLASS.card}>
                  <p className="text-[10px] text-muted-foreground flex-1 truncate">/admin/chat</p>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={copyInviteLink} className="shrink-0 text-primary hover:opacity-70 transition-opacity">
                    <AnimatePresence mode="wait">
                      {inviteCopied
                        ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="h-3.5 w-3.5 text-green-400" /></motion.div>
                        : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="h-3.5 w-3.5" /></motion.div>
                      }
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>

              {/* Members list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {onlineAdmins.map((a, i) => (
                  <motion.div key={a.adminId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-white/6 hover:border-white/12 transition-all" style={GLASS.card}>
                    <div className="relative">
                      <Avatar name={a.adminName} size={36} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{a.adminName}{a.adminId === adminId && " (You)"}</p>
                      <p className="text-[10px] text-green-400 font-bold">Online</p>
                    </div>
                    {a.adminId !== adminId && (
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setShowMembers(false); startCall(a); }}
                        className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center transition-colors border border-primary/20">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
                {onlineAdmins.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No admins online</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 z-10"
          style={GLASS.header}>
          <div className="relative">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
          <div className="flex-1">
            <p className="font-black text-sm">Admin Group</p>
            <AnimatePresence mode="wait">
              {typingAdmins.filter(n => n !== adminName).length > 0 ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      className="w-1 h-1 rounded-full bg-primary inline-block" />
                  ))}
                  <span className="text-[10px] text-primary ml-0.5">{typingAdmins.filter(n => n !== adminName)[0]} typing</span>
                </motion.div>
              ) : (
                <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-green-400">
                  {onlineAdmins.length > 0 ? `${onlineAdmins.length} member${onlineAdmins.length !== 1 ? "s" : ""} online` : "Connecting…"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Group call button */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={startGroupCall} disabled={callState !== "idle"}
              title="Call all admins"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-40"
              style={{ background: "rgba(255,102,0,0.1)", borderColor: "rgba(255,102,0,0.25)", color: "#ff6600" }}>
              <PhoneCall className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Call All</span>
            </motion.button>
            {/* Members button */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowMembers(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Members</span>
              {onlineAdmins.length > 0 && <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">{onlineAdmins.length}</span>}
            </motion.button>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth">
          {visibleMessages.map((msg, idx) => {
            const isMe = msg.senderId === adminId;
            const showAvatar = !isMe && (idx === 0 || visibleMessages[idx - 1]?.senderId !== msg.senderId);
            const showName = showAvatar;
            return (
              <motion.div key={msg.id ?? `pending-${idx}`}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: msg._pending ? 0.65 : 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                {!isMe && (
                  <div className="w-7 shrink-0 mb-1">
                    {showAvatar ? <Avatar name={msg.senderName} size={28} /> : null}
                  </div>
                )}

                <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {showName && <p className="text-[10px] font-bold text-muted-foreground pl-1">{msg.senderName}</p>}

                  <div className="relative group">
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowReactFor(showReactFor === (msg.id ?? null) ? null : (msg.id ?? null))}
                      className={`px-4 py-2.5 rounded-2xl text-sm cursor-pointer select-none ${
                        isMe
                          ? "rounded-br-sm shadow-lg shadow-primary/20"
                          : "rounded-bl-sm border border-white/8"
                      }`}
                      style={isMe
                        ? { background: "linear-gradient(135deg, #ff6600 0%, #ff8800 100%)" }
                        : { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }
                      }>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </motion.div>

                    {/* Reactions */}
                    {Object.keys(msg.reactions ?? {}).length > 0 && (
                      <div className={`absolute -bottom-3 flex gap-0.5 ${isMe ? "right-1" : "left-1"} z-10`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
                          <motion.button key={emoji} initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }}
                            onClick={() => msg.id && reactToMessage(msg.id, emoji)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border text-white flex items-center gap-0.5 transition-all
                              ${users.includes(adminId) ? "border-primary/50 bg-primary/25" : "border-white/10 bg-white/5"}`}>
                            {emoji} {users.length > 1 && <span className="font-bold text-[9px]">{users.length}</span>}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className={`text-[10px] text-muted-foreground/50 px-1 ${isMe ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                    {msg._pending && " ·  Sending…"}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingAdmins.filter(n => n !== adminName).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2 pl-9">
                <div className="flex gap-1 px-4 py-2.5 rounded-2xl rounded-bl-sm border border-white/8"
                  style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
                  {[0,1,2].map(i => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{typingAdmins.filter(n => n !== adminName)[0]} is typing…</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-2">
              <div className="flex gap-2 p-3 rounded-2xl border border-white/10 flex-wrap" style={GLASS.panel}>
                {QUICK_EMOJIS.map(e => (
                  <motion.button key={e} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                    onClick={() => { setInput(i => i + e); setShowEmoji(false); inputRef.current?.focus(); }}
                    className="text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">{e}</motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji reactions picker */}
        <AnimatePresence>
          {showReactFor !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 10 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 p-3 rounded-2xl border border-white/15 shadow-2xl"
              style={GLASS.panel}>
              {EMOJIS.map(e => (
                <motion.button key={e} whileHover={{ scale: 1.35, y: -4 }} whileTap={{ scale: 0.85 }}
                  onClick={() => showReactFor !== null && reactToMessage(showReactFor, e)}
                  className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-4 pb-4 pt-2 border-t border-white/8" style={GLASS.header}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10"
            style={GLASS.input}>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowEmoji(s => !s)}
              className={`transition-colors ${showEmoji ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
              <Smile className="h-5 w-5" />
            </motion.button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
            />
            <AnimatePresence>
              {input.trim() && (
                <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.85 }} onClick={() => sendMessage()} disabled={sending}
                  className="w-9 h-9 rounded-xl bg-primary hover:opacity-90 disabled:opacity-30 flex items-center justify-center transition-all shrink-0 shadow-lg shadow-primary/30">
                  <Send className="h-4 w-4 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
