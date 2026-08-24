/* @refresh reset */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Send, Smile, X, Users,
  Copy, Check, Bell, BellOff, PhoneCall, PhoneIncoming, Maximize2, Minimize2, Camera, CameraOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ──────────────────────────────────────────────────────────────────────
type ChatMessage = {
  id?: number; senderId: string; senderName: string; message: string;
  type: string; conversationId?: string; clientMessageId?: string | null; metadata?: string | null; reactions: Record<string, string[]>;
  readBy: string[]; createdAt: string; _pending?: boolean;
};
type OnlineAdmin = { adminId: string; adminName: string };
type CallState = "idle" | "calling" | "receiving" | "in-call";

// ── Constants ──────────────────────────────────────────────────────────────────
const EMOJIS = ["🔥", "👍", "❤️", "😂", "⚡", "💪", "✅", "🚀"];
const QUICK_EMOJIS = ["😀","😂","❤️","🔥","👍","🚀","⚡","💪","✅","🎉","😎","🤝","💯","🙏","🛍️","📦"];
const AVATAR_COLORS = ["#ff6600", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

// ── Audio / Video constraints (HD quality) ────────────────────────────────────
const AUDIO_CONSTRAINTS = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};
const VIDEO_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

// ── ICE servers ────────────────────────────────────────────────────────────────
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// ── Glass style helpers ────────────────────────────────────────────────────────
const G = {
  card:    { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" },
  dark:    { background: "rgba(0,0,0,0.55)",       backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" },
  panel:   { background: "rgba(8,8,12,0.92)",      backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" },
  header:  { background: "rgba(12,12,18,0.80)",    backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" },
  input:   { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  sidebar: { background: "rgba(5,5,10,0.97)",      backdropFilter: "blur(50px)", WebkitBackdropFilter: "blur(50px)" },
};

function getAvatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── VAPID helper ───────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── PWA detection ──────────────────────────────────────────────────────────────
function isPWA() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

// ── Sound effects ──────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}
function playTypingClick() {
  try {
    const ctx = getCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square"; osc.frequency.setValueAtTime(700, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.04, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.035);
  } catch {}
}
function playSentSound() {
  try {
    const ctx = getCtx();
    [0, 0.06].forEach((delay, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(i === 0 ? 600 : 900, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.07, ctx.currentTime + delay); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {}
}
function playReceivedSound() {
  try {
    const ctx = getCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.09, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
  } catch {}
}
let _ringOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
function startRingTone() {
  try {
    stopRingTone(); const ctx = getCtx();
    function ring() {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.14, ctx.currentTime + 0.3); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6); _ringOscillators.push({ osc, gain });
    }
    ring(); const id = setInterval(ring, 1800); (_audioCtx as any)._ringInterval = id;
  } catch {}
}
function stopRingTone() {
  try {
    _ringOscillators.forEach(({ osc, gain }) => { try { gain.gain.setValueAtTime(0, getCtx().currentTime); osc.stop(); } catch {} });
    _ringOscillators = [];
    if ((_audioCtx as any)?._ringInterval) { clearInterval((_audioCtx as any)._ringInterval); delete (_audioCtx as any)._ringInterval; }
  } catch {}
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, color, ring }: { name: string; size?: number; color?: string; ring?: boolean }) {
  const bg = color ?? getAvatarColor(name);
  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
      {ring && (
        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${bg}`, pointerEvents: "none" }} />
      )}
      <div style={{ width: size, height: size, background: bg, fontSize: size * 0.38, borderRadius: "50%" }}
        className="flex items-center justify-center font-black text-white uppercase select-none shadow-lg">
        {name.slice(0, 2)}
      </div>
    </div>
  );
}

// ── Speaking animation ─────────────────────────────────────────────────────────
function SpeakingWave() {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
        <motion.div key={i}
          animate={{ scaleY: [0.3, h, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.08, ease: "easeInOut" }}
          style={{ width: 2.5, height: 12, background: "#ff6600", borderRadius: 2, transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminChatPage() {
  const { toast } = useToast();

  // Identity
  const [adminId] = useState(() => {
    let id = localStorage.getItem("fp_admin_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("fp_admin_id", id); }
    return id;
  });
  const [adminName] = useState(() => localStorage.getItem("fp_admin_name") ?? "Admin");

  // Responsive detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
  const [cameraOn, setCameraOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [callMaximized, setCallMaximized] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [localHasVideo, setLocalHasVideo] = useState(false);

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
  const typingLastSentRef = useRef(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClickThrottleRef = useRef(0);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const activeCallIdRef = useRef<string | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history
  useEffect(() => {
    fetch(`${BASE}/api/admin/chat/messages`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then((msgs: ChatMessage[]) => {
        setMessages(msgs);
      }).catch(() => {});
  }, []);

  // TURN is optional, but when configured it is delivered only after admin auth.
  useEffect(() => {
    fetch(`${BASE}/api/admin/chat/ice-config`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { iceServers?: RTCIceServer[] } | null) => {
        if (data?.iceServers?.length) iceServersRef.current = data.iceServers;
      })
      .catch(() => {});
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
            if (msg.clientMessageId) {
              const optimisticIndex = prev.findIndex(m => m.clientMessageId === msg.clientMessageId);
              if (optimisticIndex >= 0) {
                const next = [...prev];
                next[optimisticIndex] = msg;
                return next;
              }
            }
          if (msg.senderId !== adminId) playReceivedSound();
          return [...prev, msg];
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
        const sig = data.signal as { type: string };
        // Show browser notification for incoming call if page is hidden
        if (sig.type === "offer" && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("📞 Incoming Call", {
              body: `${data.fromName} is calling you on FirstPick`,
              tag: "incoming-call",
              requireInteraction: true,
            });
          } catch {}
        }
        handleSignal(
          data.from as string,
          data.fromName as string,
          sig as RTCSessionDescriptionInit | RTCIceCandidateInit,
          typeof data.callId === "string" ? data.callId : undefined,
        );
      }
    };

    return () => { es.close(); };
  }, [adminId, adminName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
  }, []);

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

  // Incoming ring
  useEffect(() => {
    if (callState === "receiving") startRingTone();
    else stopRingTone();
    return () => stopRingTone();
  }, [callState]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setSending(true); playSentSound();
    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      senderId: adminId, senderName: adminName, message: msg,
      type: "text", conversationId: "group", clientMessageId,
      reactions: {}, readBy: [adminId], createdAt: new Date().toISOString(), _pending: true
    };
    setMessages(prev => [...prev, optimistic]); setInput("");
    try {
      const res = await fetch(`${BASE}/api/admin/chat/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: adminId, senderName: adminName, message: msg, clientMessageId, conversationId: "group" }),
      });
      if (!res.ok) throw new Error("Message could not be sent");
      const saved = await res.json() as ChatMessage;
      setMessages(prev => {
        const i = prev.findIndex(m => m.clientMessageId === clientMessageId);
        if (i < 0) return prev.some(m => m.id === saved.id) ? prev : [...prev, saved];
        const next = [...prev];
        next[i] = saved;
        return next;
      });
    } catch {
      setMessages(prev => prev.filter(m => m.clientMessageId !== clientMessageId));
      toast({ title: "Failed to send", variant: "destructive" });
    } finally { setSending(false); }
  }, [input, sending, adminId, adminName, toast]);

  // ── Typing ────────────────────────────────────────────────────────────────────
  const broadcastTyping = (typing: boolean) => {
    const now = Date.now();
    if (typing && now - typingLastSentRef.current < 900) return;
    typingLastSentRef.current = now;
    fetch(`${BASE}/api/admin/chat/typing`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: adminId, senderName: adminName, typing, conversationId: "group" }),
    }).catch(() => {});
  };
  const handleInputChange = (val: string) => {
    setInput(val);
    const now = Date.now();
    if (now - typingClickThrottleRef.current > 80) { typingClickThrottleRef.current = now; playTypingClick(); }
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
    const res = await fetch(`${BASE}/api/admin/chat/signal`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to ?? undefined, from: adminId, fromName: adminName,
        signal: data, broadcast: broadcast ?? false, callId: activeCallIdRef.current ?? undefined,
      }),
    });
    if (!res.ok) throw new Error("Call signal failed");
  }, [adminId, adminName]);

  const endCall = useCallback(() => {
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    activeCallIdRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle"); setCallPeer(null); setMuted(false); setCameraOn(false);
    setLocalHasVideo(false); setRemoteHasVideo(false); setCallMaximized(false);
  }, []);

  const createPeer = useCallback(async (initiator: boolean, targetId: string, withVideo = false): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcRef.current = pc;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support microphone or camera calling.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: withVideo ? VIDEO_CONSTRAINTS : false,
      });
    } catch (error) {
      if (!withVideo) throw error;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        toast({ title: "Camera unavailable", description: "The call will continue with audio only." });
      } catch {
        throw error;
      }
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const hasVid = stream.getVideoTracks().length > 0;
    setLocalHasVideo(hasVid);
    setCameraOn(hasVid);

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      const hasRemoteVid = e.streams[0]?.getVideoTracks().length > 0;
      setRemoteHasVideo(hasRemoteVid);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) signal(targetId, { type: "ice-candidate", candidate: e.candidate }).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        setCallState("in-call");
      }
      if (pc.connectionState === "disconnected") {
        setCallState("calling");
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          if (pc.connectionState === "disconnected") {
            toast({ title: "Call connection lost", variant: "destructive" });
            endCall();
          }
        }, 7_000);
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        toast({ title: "Call ended", description: "The connection could not be maintained.", variant: "destructive" });
        endCall();
      }
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(targetId, { type: "offer", offer });
    }
    return pc;
  }, [signal, endCall, toast]);

  const startGroupCall = async (withVideo = false) => {
    if (callState !== "idle") return;
    const firstAvailable = onlineAdmins.find((admin) => admin.adminId !== adminId);
    if (!firstAvailable) {
      toast({ title: "No team member online", description: "Start a direct call when another admin is available." });
      return;
    }
    await startCall(firstAvailable, withVideo);
  };

  const startCall = async (peer: OnlineAdmin, withVideo = false) => {
    if (callState !== "idle") return;
    try {
      activeCallIdRef.current = crypto.randomUUID();
      setCallState("calling"); setCallPeer(peer);
      const pc = await createPeer(false, peer.adminId, withVideo);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(peer.adminId, { type: "offer", offer });
    } catch (error) {
      endCall();
      toast({
        title: "Call could not start",
        description: error instanceof Error ? error.message : "Allow microphone access and try again.",
        variant: "destructive",
      });
    }
  };

  const acceptCall = async (withVideo = false) => {
    if (!incomingCall) return;
    try {
      setCallState("calling");
      setCallPeer({ adminId: incomingCall.from, adminName: incomingCall.fromName });
      const pc = await createPeer(false, incomingCall.from, withVideo);
      await pc.setRemoteDescription(incomingCall.offer);
      for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signal(incomingCall.from, { type: "answer", answer });
      setIncomingCall(null);
    } catch (error) {
      endCall();
      toast({
        title: "Call could not connect",
        description: error instanceof Error ? error.message : "Allow microphone access and try again.",
        variant: "destructive",
      });
    }
  };

  const declineCall = () => {
    if (!incomingCall) return;
    signal(incomingCall.from, { type: "declined" });
    setIncomingCall(null); setCallState("idle");
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleCamera = useCallback(async () => {
    if (!pcRef.current) return;
    if (cameraOn) {
      const sender = pcRef.current.getSenders().find((item) => item.track?.kind === "video");
      await sender?.replaceTrack(null);
      localStreamRef.current?.getVideoTracks().forEach(t => { t.stop(); localStreamRef.current?.removeTrack(t); });
      setCameraOn(false); setLocalHasVideo(false);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) return;
        // Add to local stream
        if (!localStreamRef.current) return;
        localStreamRef.current.addTrack(videoTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        // Replace or add sender on the peer connection
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === "video" || !s.track);
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        } else {
          pcRef.current.addTrack(videoTrack, localStreamRef.current);
        }
        setCameraOn(true); setLocalHasVideo(true);
      } catch {
        toast({ title: "Camera unavailable", variant: "destructive" });
      }
    }
  }, [cameraOn, toast]);

  const handleSignal = useCallback(async (
    from: string,
    fromName: string,
    sig: RTCSessionDescriptionInit | RTCIceCandidateInit | { type: string },
    callId?: string,
  ) => {
    const t = (sig as { type: string }).type;
    if (t === "offer") {
      if (callState !== "idle") {
        signal(from, { type: "busy" }).catch(() => {});
        return;
      }
      const offerSig = sig as { type: "offer"; offer: RTCSessionDescriptionInit };
      activeCallIdRef.current = callId ?? crypto.randomUUID();
      setIncomingCall({ from, fromName, offer: offerSig.offer });
      setCallState("receiving");
    } else if (t === "answer" && pcRef.current) {
      await pcRef.current.setRemoteDescription((sig as { type: "answer"; answer: RTCSessionDescriptionInit }).answer);
      for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
        await pcRef.current.addIceCandidate(candidate).catch(() => {});
      }
    } else if (t === "ice-candidate" && pcRef.current) {
      const candidate = (sig as { type: "ice-candidate"; candidate: RTCIceCandidateInit }).candidate;
      if (pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    } else if (t === "declined") {
      endCall(); toast({ title: "Call declined" });
    } else if (t === "busy") {
      endCall(); toast({ title: "Admin is busy", description: `${fromName} is already on another call.` });
    }
  }, [callState, endCall, signal, toast]);

  // ── Push subscribe ────────────────────────────────────────────────────────────
  const subscribePush = async () => {
    if (pushLoading) return; setPushLoading(true);
    try {
      if (typeof Notification === "undefined") {
        toast({ title: "Notifications not supported", description: "Add FirstPick to your Home Screen, then try again.", variant: "destructive" });
        setPushLoading(false); return;
      }
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
      toast({ title: "🔔 Notifications enabled!" });
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
  const isCallActive = callState === "calling" || callState === "in-call";
  const showFullscreenCall = isCallActive && (isMobile || callMaximized);

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col relative overflow-hidden"
      style={{
        height: "100%",
        background: "linear-gradient(135deg, rgba(10,5,15,1) 0%, rgba(5,5,10,1) 100%)",
      }}
    >
      {/* Background aurora */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, #ff6600 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.04, 0.08, 0.04] }} transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      </div>

      {/* ── Fullscreen call UI (mobile in-call / maximized) ── */}
      <AnimatePresence>
        {showFullscreenCall && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: "rgba(0,0,0,0.97)" }}
          >
            {/* Remote video / avatar */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {remoteHasVideo ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                    <Avatar name={callPeer?.adminName ?? "?"} size={100} ring={callState === "calling"} />
                  </motion.div>
                  <p className="text-xl font-black">{callPeer?.adminName ?? "Admin Group"}</p>
                  {callState === "calling" ? (
                    <div className="flex items-center gap-1.5">
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.25 }}
                          className="w-2 h-2 rounded-full bg-primary" />
                      ))}
                      <p className="text-muted-foreground text-sm ml-1">Ringing…</p>
                    </div>
                  ) : (
                    <SpeakingWave />
                  )}
                  {/* Ripple rings for calling state */}
                  {callState === "calling" && [0,1,2].map(i => (
                    <motion.div key={i} animate={{ scale: [1, 2.8], opacity: [0.25, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.8 }}
                      className="absolute w-32 h-32 rounded-full border border-primary/30" />
                  ))}
                </div>
              )}

              {/* Local video PiP */}
              <motion.div drag dragConstraints={{ top: 8, left: 8, right: 8, bottom: 8 }}
                className="absolute bottom-4 right-4 rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl cursor-grab active:cursor-grabbing z-10"
                style={{ width: 100, aspectRatio: "9/16" }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!localHasVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Avatar name={adminName} size={36} />
                  </div>
                )}
              </motion.div>

              {/* Duration & minimize row */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-safe pt-4" style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
                {callState === "in-call" && (
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono font-black text-primary border border-primary/20">
                    {formatDuration(callDuration)}
                  </div>
                )}
                {!isMobile && (
                  <button onClick={() => setCallMaximized(false)}
                    className="ml-auto w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                    <Minimize2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Control bar */}
            <div className="flex items-center justify-center gap-6 py-8"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 32px)", ...G.dark }}>
              {/* Mute */}
              <motion.button whileTap={{ scale: 0.88 }} onClick={toggleMute} style={{ touchAction: "manipulation" }}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all border ${muted ? "bg-red-600/90 border-red-500/50" : "bg-white/10 border-white/15 hover:bg-white/20"}`}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="text-[9px] font-bold text-white/60">{muted ? "Muted" : "Mic"}</span>
              </motion.button>

              {/* Camera */}
              <motion.button whileTap={{ scale: 0.88 }} onClick={toggleCamera} style={{ touchAction: "manipulation" }}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all border ${cameraOn ? "bg-white/10 border-white/15 hover:bg-white/20" : "bg-white/5 border-white/10 hover:bg-white/15"}`}>
                {cameraOn ? <Camera className="h-5 w-5 text-primary" /> : <CameraOff className="h-5 w-5 text-muted-foreground" />}
                <span className="text-[9px] font-bold text-white/60">{cameraOn ? "Camera" : "No Cam"}</span>
              </motion.button>

              {/* End call */}
              <motion.button whileTap={{ scale: 0.88 }} onClick={endCall} style={{ touchAction: "manipulation" }}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex flex-col items-center justify-center gap-1 shadow-xl shadow-red-900/60">
                <PhoneOff className="h-6 w-6" />
                <span className="text-[9px] font-bold text-white/80">End</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating call card (desktop non-maximized) ── */}
      <AnimatePresence>
        {isCallActive && !showFullscreenCall && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-5 right-5 z-[100] w-72 rounded-3xl border border-white/12 overflow-hidden shadow-2xl"
            style={G.panel}
          >
            {/* Video area */}
            <div className="relative aspect-video bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!remoteHasVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                    <Avatar name={callPeer?.adminName ?? "?"} size={56} ring={callState === "calling"} />
                  </motion.div>
                  <p className="text-sm font-black">{callPeer?.adminName ?? "Admin Group"}</p>
                  {callState === "calling" ? (
                    <div className="flex items-center gap-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.25 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                    </div>
                  ) : <SpeakingWave />}
                </div>
              )}
              {/* PiP */}
              <div className="absolute top-2 right-2 w-14 rounded-lg overflow-hidden border border-white/20 bg-black" style={{ aspectRatio: "4/3" }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!localHasVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Avatar name={adminName} size={22} />
                  </div>
                )}
              </div>
              {/* Duration */}
              {callState === "in-call" && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono font-black text-primary border border-primary/20">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
            {/* Controls */}
            <div className="px-4 py-3 flex items-center justify-between" style={G.dark}>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} style={{ touchAction: "manipulation" }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${muted ? "bg-red-600/90 border-red-500/50" : "bg-white/10 border-white/10 hover:bg-white/20"}`}>
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button onClick={toggleCamera} style={{ touchAction: "manipulation" }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${cameraOn ? "bg-white/10 border-white/10" : "bg-white/5 border-white/8 hover:bg-white/15"}`}>
                  {cameraOn ? <Camera className="h-3.5 w-3.5 text-primary" /> : <CameraOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCallMaximized(true)} style={{ touchAction: "manipulation" }}
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center border border-white/8 transition-all">
                  <Maximize2 className="h-3.5 w-3.5 text-white/70" />
                </button>
                <button onClick={endCall} style={{ touchAction: "manipulation" }}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/50 transition-colors">
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Incoming call overlay ── */}
      <AnimatePresence>
        {incomingCall && callState === "receiving" && (
          <>
            {/* Mobile: bottom sheet */}
            {isMobile ? (
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="fixed inset-x-0 bottom-0 z-[300] rounded-t-3xl border-t border-white/12 overflow-hidden"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)", ...G.panel }}
              >
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-5" />
                <div className="px-6 pb-2">
                  <div className="flex items-center gap-4 mb-7">
                    <Avatar name={incomingCall.fromName} size={64} ring />
                    <div>
                      <p className="font-black text-lg">{incomingCall.fromName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                          <PhoneIncoming className="h-3.5 w-3.5 text-green-400" />
                        </motion.div>
                        <p className="text-sm text-green-400 font-bold">Incoming Call…</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <motion.button whileTap={{ scale: 0.93 }} onClick={declineCall} style={{ touchAction: "manipulation" }}
                      className="py-4 rounded-2xl bg-red-600/90 text-white font-black text-sm flex flex-col items-center gap-1.5">
                      <PhoneOff className="h-5 w-5" />
                      <span className="text-xs">Decline</span>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => acceptCall(false)} style={{ touchAction: "manipulation" }}
                      className="py-4 rounded-2xl bg-green-600/90 text-white font-black text-sm flex flex-col items-center gap-1.5">
                      <Mic className="h-5 w-5" />
                      <span className="text-xs">Audio</span>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => acceptCall(true)}
                      className="py-4 rounded-2xl text-white font-black text-sm flex flex-col items-center gap-1.5 border border-white/10"
                      style={{ background: "rgba(255,102,0,0.25)", touchAction: "manipulation" }}>
                      <Camera className="h-5 w-5 text-primary" />
                      <span className="text-xs">Video</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Desktop: top-right card */
              <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="fixed top-6 right-6 z-[300] rounded-3xl border border-white/15 p-5 w-80 shadow-2xl overflow-hidden"
                style={G.panel}
              >
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
                    <Avatar name={incomingCall.fromName} size={52} ring />
                    <div>
                      <p className="font-black text-base">{incomingCall.fromName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                          <PhoneIncoming className="h-3 w-3 text-green-400" />
                        </motion.div>
                        <p className="text-xs text-green-400 font-bold">Incoming Call…</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.93 }} onClick={declineCall} style={{ touchAction: "manipulation" }}
                      className="flex-1 py-3 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors">
                      <PhoneOff className="h-3.5 w-3.5" /> Decline
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => acceptCall(false)} style={{ touchAction: "manipulation" }}
                      className="flex-1 py-3 rounded-2xl bg-green-600/90 hover:bg-green-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors">
                      <Mic className="h-3.5 w-3.5" /> Audio
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => acceptCall(true)}
                      className="flex-1 py-3 rounded-2xl text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                      style={{ background: "rgba(255,102,0,0.25)", touchAction: "manipulation" }}>
                      <Camera className="h-3.5 w-3.5 text-primary" /> Video
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* ── Members panel (bottom sheet on mobile, right drawer on desktop) ── */}
      <AnimatePresence>
        {showMembers && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMembers(false)}
              className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm" />
            {isMobile ? (
              /* Mobile: bottom sheet */
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-white/8 flex flex-col max-h-[80%]"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", ...G.sidebar }}
              >
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-1 shrink-0" />
                <MembersContent
                  onlineAdmins={onlineAdmins} adminId={adminId} adminName={adminName}
                  pushEnabled={pushEnabled} pushLoading={pushLoading} inviteCopied={inviteCopied}
                  onSubscribePush={subscribePush} onCopyInvite={copyInviteLink}
                  onClose={() => setShowMembers(false)} onCall={(a) => { setShowMembers(false); startCall(a); }}
                />
              </motion.div>
            ) : (
              /* Desktop: right side drawer */
              <motion.div
                initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute right-0 top-0 h-full w-72 border-l border-white/8 flex flex-col z-20"
                style={G.sidebar}
              >
                <MembersContent
                  onlineAdmins={onlineAdmins} adminId={adminId} adminName={adminName}
                  pushEnabled={pushEnabled} pushLoading={pushLoading} inviteCopied={inviteCopied}
                  onSubscribePush={subscribePush} onCopyInvite={copyInviteLink}
                  onClose={() => setShowMembers(false)} onCall={(a) => { setShowMembers(false); startCall(a); }}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 border-b border-white/8 z-10 shrink-0"
          style={G.header}>
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Admin Group</p>
            <AnimatePresence mode="wait">
              {typingAdmins.filter(n => n !== adminName).length > 0 ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      className="w-1 h-1 rounded-full bg-primary inline-block" />
                  ))}
                  <span className="text-[10px] text-primary ml-0.5 truncate">{typingAdmins.filter(n => n !== adminName)[0]} typing</span>
                </motion.div>
              ) : (
                <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-green-400 truncate">
                  {onlineAdmins.length > 0 ? `${onlineAdmins.length} online` : "Connecting…"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => startGroupCall()} disabled={callState !== "idle"}
              title="Call all admins"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-40"
              style={{ background: "rgba(255,102,0,0.12)", borderColor: "rgba(255,102,0,0.3)", color: "#ff6600", touchAction: "manipulation" }}>
              <PhoneCall className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Call</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowMembers(s => !s)}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
              <Users className="h-3.5 w-3.5" />
              {onlineAdmins.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shrink-0">
                  {onlineAdmins.length}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-2 overscroll-contain">
          {visibleMessages.map((msg, idx) => {
            const isMe = msg.senderId === adminId;
            const showAvatar = !isMe && (idx === 0 || visibleMessages[idx - 1]?.senderId !== msg.senderId);
            return (
              <motion.div key={msg.id ?? `pending-${idx}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: msg._pending ? 0.6 : 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>

                {!isMe && (
                  <div className="w-7 shrink-0 mb-1">
                    {showAvatar ? <Avatar name={msg.senderName} size={28} /> : null}
                  </div>
                )}

                <div className={`max-w-[78%] sm:max-w-[65%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {showAvatar && !isMe && <p className="text-[10px] font-bold text-muted-foreground pl-1">{msg.senderName}</p>}
                  <div className="relative group">
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowReactFor(showReactFor === (msg.id ?? null) ? null : (msg.id ?? null))}
                      className={`px-4 py-2.5 rounded-2xl text-sm cursor-pointer select-none ${isMe ? "rounded-br-sm" : "rounded-bl-sm border border-white/8"}`}
                      style={isMe
                        ? { background: "linear-gradient(135deg, #ff6600 0%, #ff8800 100%)", boxShadow: "0 4px 20px rgba(255,102,0,0.25)" }
                        : { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }
                      }>
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    </motion.div>
                    {Object.keys(msg.reactions ?? {}).length > 0 && (
                      <div className={`absolute -bottom-3 flex gap-0.5 ${isMe ? "right-1" : "left-1"} z-10`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
                          <motion.button key={emoji} initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }}
                            onClick={() => msg.id && reactToMessage(msg.id, emoji)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border text-white flex items-center gap-0.5
                              ${users.includes(adminId) ? "border-primary/50 bg-primary/25" : "border-white/10 bg-white/5"}`}>
                            {emoji} {users.length > 1 && <span className="font-bold text-[9px]">{users.length}</span>}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] text-muted-foreground/50 px-1 ${isMe ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                    {msg._pending && " · Sending…"}
                  </p>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {typingAdmins.filter(n => n !== adminName).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2 pl-9">
                <div className="flex gap-1 px-4 py-2.5 rounded-2xl rounded-bl-sm border border-white/8"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {[0,1,2].map(i => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji reaction picker */}
          <AnimatePresence>
            {showReactFor !== null && (
              <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 10 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 p-3 rounded-2xl border border-white/15 shadow-2xl"
                style={G.panel}>
                {EMOJIS.map(e => (
                  <motion.button key={e} whileHover={{ scale: 1.35, y: -4 }} whileTap={{ scale: 0.85 }}
                    style={{ touchAction: "manipulation" }}
                    onClick={() => showReactFor !== null && reactToMessage(showReactFor, e)}
                    className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10">
                    {e}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-2 shrink-0">
              <div className="flex gap-1.5 p-3 rounded-2xl border border-white/10 flex-wrap" style={G.panel}>
                {QUICK_EMOJIS.map(e => (
                  <motion.button key={e} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                    style={{ touchAction: "manipulation" }}
                    onClick={() => { setInput(i => i + e); setShowEmoji(false); inputRef.current?.focus(); }}
                    className="text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">{e}</motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="px-4 pt-2 pb-2 border-t border-white/8 shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)", ...G.header }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10" style={G.input}>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowEmoji(s => !s)}
              style={{ touchAction: "manipulation" }}
              className={`shrink-0 transition-colors ${showEmoji ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
              <Smile className="h-5 w-5" />
            </motion.button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Message…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
            />
            <AnimatePresence>
              {input.trim() && (
                <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.85 }} onClick={() => sendMessage()} disabled={sending}
                  style={{ touchAction: "manipulation" }}
                  className="w-9 h-9 rounded-xl bg-primary hover:opacity-90 disabled:opacity-30 flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                  <Send className="h-4 w-4 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Members panel content (shared between mobile/desktop) ─────────────────────
function MembersContent({
  onlineAdmins, adminId, adminName, pushEnabled, pushLoading, inviteCopied,
  onSubscribePush, onCopyInvite, onClose, onCall,
}: {
  onlineAdmins: OnlineAdmin[]; adminId: string; adminName: string;
  pushEnabled: boolean; pushLoading: boolean; inviteCopied: boolean;
  onSubscribePush: () => void; onCopyInvite: () => void;
  onClose: () => void; onCall: (a: OnlineAdmin) => void;
}) {
  const G_sidebar = { background: "transparent" };
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-white/8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="font-black uppercase tracking-widest text-xs">{onlineAdmins.length} Online</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} style={{ touchAction: "manipulation" }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
          <X className="h-4 w-4 text-muted-foreground" />
        </motion.button>
      </div>

      {/* Push notifications */}
      <div className="p-4 border-b border-white/8 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2.5">Notifications</p>
        <button onClick={onSubscribePush} disabled={pushEnabled || pushLoading} style={{ touchAction: "manipulation" }}
          className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border
            ${pushEnabled ? "bg-green-600/15 border-green-500/30 text-green-400 cursor-default" : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"}`}>
          {pushEnabled ? <><Bell className="h-3.5 w-3.5" /> Enabled</> : pushLoading ? "Setting up…" : <><BellOff className="h-3.5 w-3.5" /> Enable Alerts</>}
        </button>
        {!pushEnabled && <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Rings when app is in background</p>}
      </div>

      {/* Invite */}
      <div className="p-4 border-b border-white/8 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Invite Link</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] text-muted-foreground flex-1 truncate">/admin/chat</p>
          <motion.button whileTap={{ scale: 0.85 }} onClick={onCopyInvite} style={{ touchAction: "manipulation" }} className="shrink-0 text-primary">
            <AnimatePresence mode="wait">
              {inviteCopied
                ? <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="h-3.5 w-3.5 text-green-400" /></motion.div>
                : <motion.div key="cp" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="h-3.5 w-3.5" /></motion.div>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {onlineAdmins.map((a, i) => (
          <motion.div key={a.adminId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/6 hover:border-white/12 transition-all" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="relative">
              <Avatar name={a.adminName} size={36} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{a.adminName}{a.adminId === adminId && " (You)"}</p>
              <p className="text-[10px] text-green-400 font-bold">Online</p>
            </div>
            {a.adminId !== adminId && (
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => onCall(a)} style={{ touchAction: "manipulation" }}
                className="w-9 h-9 rounded-full bg-primary/20 hover:bg-primary/40 flex items-center justify-center border border-primary/20">
                <Phone className="h-3.5 w-3.5 text-primary" />
              </motion.button>
            )}
          </motion.div>
        ))}
        {onlineAdmins.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No admins online</p>
        )}
      </div>
    </>
  );
}
