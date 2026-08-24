import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Send, Users,
  Minimize2, Maximize2, Search, Video, Info, Paperclip, Smile, Lock,
  UserPlus, Monitor, SquarePen, ArrowLeft, PhoneCall, PhoneOutgoing
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
type Admin={adminId:string;adminName:string}; 
type Message={id?:number;senderId:string;senderName:string;message:string;conversationId:string;createdAt:string;reactions:Record<string,string[]>;clientMessageId?:string};

const initials = (s:string) => s.slice(0,2).toUpperCase();
const dm = (a:string,b:string) => `dm:${[a,b].sort((x,y) => Number(x)-Number(y)).join(":")}`;

export default function AdminChatPage() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isCalls = search.includes("view=calls");
  
  const {toast}=useToast(); 
  const [me,setMe]=useState<Admin|null>(null); 
  const [admins,setAdmins]=useState<Admin[]>([]);
  const [online,setOnline]=useState<Admin[]>([]); 
  const [conversation,setConversation]=useState("group"); 
  const [messages,setMessages]=useState<Message[]>([]);
  const [text,setText]=useState(""); 
  const [typing,setTyping]=useState<string[]>([]); 
  const [unread,setUnread]=useState<Record<string,number>>({}); 
  const [mobileList,setMobileList]=useState(true);
  const [room,setRoom]=useState<string|null>(null); 
  const [members,setMembers]=useState<string[]>([]); 
  const [minimized,setMinimized]=useState(false); 
  const [muted,setMuted]=useState(false); 
  const [camera,setCamera]=useState(false);
  const device=useRef(crypto.randomUUID());
  const es=useRef<EventSource|null>(null); 
  const stream=useRef<MediaStream|null>(null); 
  const roomRef=useRef<string|null>(null);
  const pcs=useRef(new Map<string,RTCPeerConnection>());
  const videos=useRef(new Map<string,MediaStream>());
  const [remote,setRemote]=useState<Record<string,MediaStream>>({});
  const localVideo=useRef<HTMLVideoElement>(null); 
  const ice=useRef<RTCIceServer[]>([{urls:"stun:stun.l.google.com:19302"}]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load=useCallback(async(id:string)=>{const r=await fetch(`${BASE}/api/admin/chat/messages?conversationId=${encodeURIComponent(id)}`,{credentials:"include"});if(r.ok)setMessages(await r.json());},[]);
  useEffect(()=>{fetch(`${BASE}/api/admin/chat/conversations`,{credentials:"include"}).then(r=>r.ok?r.json():null).then(d=>{if(d){setMe({adminId:d.me.id,adminName:d.me.name});setAdmins(d.admins);}});fetch(`${BASE}/api/admin/chat/ice-config`,{credentials:"include"}).then(r=>r.json()).then(d=>{if(d.iceServers)ice.current=d.iceServers}).catch(()=>{});},[]);
  useEffect(()=>{const invited=new URLSearchParams(window.location.search).get("room");if(invited){roomRef.current=invited;setRoom(invited);}},[]);
  useEffect(()=>{load(conversation);setTyping([]);},[conversation,load]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const closeRoom=useCallback(async()=>{const id=roomRef.current;roomRef.current=null;for(const pc of pcs.current.values())pc.close();pcs.current.clear();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setRemote({});setRoom(null);setMembers([]);setCamera(false);if(id)fetch(`${BASE}/api/admin/chat/rooms/${id}/leave`,{method:"POST",credentials:"include"}).catch(()=>{});},[]);
  const sendSignal=useCallback((id:string,to:string,signal:any)=>fetch(`${BASE}/api/admin/chat/rooms/${id}/signal`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({to,signal})}),[]);
  const peer=useCallback(async(peerId:string,id:string,offer:boolean)=>{
    if(!stream.current)return; const pc=new RTCPeerConnection({iceServers:ice.current});pcs.current.set(peerId,pc);stream.current.getTracks().forEach(t=>pc.addTrack(t,stream.current!));
    pc.onicecandidate=e=>{if(e.candidate)sendSignal(id,peerId,{type:"ice",candidate:e.candidate}).catch(()=>{})};
    pc.ontrack=e=>{const s=e.streams[0]||new MediaStream([e.track]);videos.current.set(peerId,s);setRemote(Object.fromEntries(videos.current));};
    pc.onconnectionstatechange=()=>{if(["failed","closed"].includes(pc.connectionState)){pcs.current.delete(peerId);videos.current.delete(peerId);setRemote(Object.fromEntries(videos.current));}};
    if(offer){const o=await pc.createOffer();await pc.setLocalDescription(o);await sendSignal(id,peerId,{type:"offer",offer:o});} return pc;
  },[sendSignal]);

  useEffect(()=>{
    if(!me)return;
    const source=new EventSource(`${BASE}/api/admin/chat/stream?deviceId=${device.current}`,{withCredentials:true});
    es.current=source;
    source.onmessage=async e=>{
      const d=JSON.parse(e.data);
      if(d.type==="PRESENCE")setOnline(d.onlineAdmins||[]);
      if(d.type==="MESSAGE"){if(d.message.conversationId===conversation)setMessages(p=>p.some(x=>x.id===d.message.id)?p:[...p,d.message]);else setUnread(p=>({...p,[d.message.conversationId]:(p[d.message.conversationId]||0)+1}));}
      if(d.type==="REACTION"&&d.conversationId===conversation)setMessages(p=>p.map(x=>x.id===d.messageId?{...x,reactions:d.reactions}:x));
      if(d.type==="TYPING"&&d.conversationId===conversation&&d.adminId!==me.adminId)setTyping(p=>d.typing?[...new Set([...p,d.adminName])]:p.filter(x=>x!==d.adminName));
      if(d.type==="ROOM_INVITE"){toast({title:`Call from ${d.from.name}`,description:"Join the team room from the call bar."});roomRef.current=d.roomId;setRoom(d.roomId);setMembers([]);setMinimized(false);}
      if(d.type==="ROOM_MEMBERS"&&d.roomId===room){setMembers(d.members);for(const member of d.members)if(member!==me.adminId&&Number(me.adminId)<Number(member)&&!pcs.current.has(member)&&stream.current)peer(member,d.roomId,true).catch(()=>{});}
      if(d.type==="ROOM_SIGNAL"&&d.roomId===room){let pc=pcs.current.get(d.from);if(d.signal.type==="offer"){pc=await peer(d.from,room!,false);await pc!.setRemoteDescription(d.signal.offer);const answer=await pc!.createAnswer();await pc!.setLocalDescription(answer);await sendSignal(room!,d.from,{type:"answer",answer});}else if(pc&&d.signal.type==="answer")await pc.setRemoteDescription(d.signal.answer);else if(pc&&d.signal.type==="ice")await pc.addIceCandidate(d.signal.candidate).catch(()=>{});}
    };
    return()=>source.close();
  },[me,conversation,room,peer,sendSignal,toast]);
  useEffect(()=>()=>{closeRoom();},[closeRoom]);
  
  const select=(id:string)=>{setConversation(id);setUnread(p=>{const next={...p};delete next[id];return next});setMobileList(false)};
  const send=async()=>{if(!text.trim()||!me)return;const body={message:text,conversationId:conversation,clientMessageId:crypto.randomUUID()};setText("");const r=await fetch(`${BASE}/api/admin/chat/messages`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)toast({title:"Message not sent",variant:"destructive"});};
  const typingPost=(active:boolean)=>fetch(`${BASE}/api/admin/chat/typing`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({typing:active,conversationId:conversation})}).catch(()=>{});
  const react=async(id:number,emoji:string)=>{const r=await fetch(`${BASE}/api/admin/chat/messages/${id}/react`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({emoji})});if(!r.ok)toast({title:"Reaction could not be saved",variant:"destructive"});};
  
  const join=async(id:string,withVideo=camera)=>{try{const s=await navigator.mediaDevices.getUserMedia({audio:true,video:withVideo?{width:{ideal:1280}}:false});stream.current=s;setCamera(withVideo);if(localVideo.current)localVideo.current.srcObject=s;roomRef.current=id;setRoom(id);setMinimized(false);const r=await fetch(`${BASE}/api/admin/chat/rooms/${id}/join`,{method:"POST",credentials:"include"});if(!r.ok)throw new Error("The room has ended");const d=await r.json();setMembers(d.members);for(const x of d.members)if(x!==me?.adminId&&Number(me?.adminId)<Number(x))await peer(x,id,true);}catch(e){roomRef.current=null;setCamera(false);toast({title:"Unable to join call",description:e instanceof Error?e.message:"Allow microphone access.",variant:"destructive"});setRoom(null);}};
  const start=async()=>{const r=await fetch(`${BASE}/api/admin/chat/rooms`,{method:"POST",credentials:"include"});if(!r.ok){toast({title:"Could not start call",variant:"destructive"});return;}const d=await r.json();await join(d.roomId,true);};
  const directName=(id:string)=>admins.find(a=>a.adminId!==(me?.adminId) && id.includes(`:${a.adminId}`))?.adminName||"Direct message";
  const getAvatar=(name:string)=>{return <div className="w-10 h-10 rounded-full bg-[#111111] text-gray-300 flex items-center justify-center text-sm font-bold border border-[#222] shrink-0">{initials(name)}</div>};

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // Calls UI state mock data
  const recentCalls = admins.filter(a => a.adminId !== me?.adminId).slice(0, 5);

  return (
    <div className="h-full w-full flex bg-[#000000] text-white">
      {/* LEFT COLUMN: CHATS / CALLS LIST */}
      <aside className={`${mobileList ? "flex" : "hidden"} md:flex w-full md:w-[320px] shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0A0A0A] relative`}>
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{isCalls ? "Calls" : "Chats"}</h1>
            <button className="text-orange-500 hover:bg-[#1a1a1a] p-1.5 rounded-lg transition-colors">
              {isCalls ? <PhoneCall className="w-5 h-5" /> : <SquarePen className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#ff6600] text-black">
              All
            </button>
            {!isCalls && (
              <>
                <button className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-gray-300 flex items-center gap-1.5">
                  Unread {totalUnread > 0 && <span className="bg-[#ff6600] text-black px-1.5 rounded-full text-[10px] font-bold">{totalUnread}</span>}
                </button>
                <button className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-gray-300">
                  Groups
                </button>
              </>
            )}
            {isCalls && (
              <>
                <button className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-gray-300">Missed</button>
                <button className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-gray-300">Voicemail</button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-20 scrollbar-hide">
          {!isCalls ? (
            <>
              {/* Chat list */}
              <button 
                onClick={() => select("group")} 
                className={`w-full text-left p-3 mb-1 rounded-2xl flex gap-3 transition-colors items-center ${conversation === "group" ? "bg-[#1a110a] border border-[#ff6600]/30" : "hover:bg-[#111]"}`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#111111] text-gray-300 flex items-center justify-center border border-[#222] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[13px] font-bold text-white truncate">Admin Group</span>
                    <span className="text-[10px] text-gray-500 shrink-0">8:20 PM</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                    {online.length} online
                  </div>
                </div>
                {unread.group ? <span className="w-5 h-5 rounded-full bg-[#ff6600] text-black flex items-center justify-center text-[10px] font-bold shrink-0">{unread.group}</span> : null}
              </button>

              {admins.filter(a => a.adminId !== me?.adminId).map(a => {
                const id = dm(me!.adminId, a.adminId);
                const isOnline = online.some(x => x.adminId === a.adminId);
                const isActive = conversation === id;
                return (
                  <button 
                    key={a.adminId} 
                    onClick={() => select(id)} 
                    className={`w-full text-left p-3 mb-1 rounded-2xl flex gap-3 transition-colors items-center ${isActive ? "bg-[#1a110a] border border-[#ff6600]/30" : "hover:bg-[#111]"}`}
                  >
                    <div className="relative">
                      {getAvatar(a.adminName)}
                      {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-[13px] font-bold text-white truncate">{a.adminName}</span>
                        <span className="text-[10px] text-gray-500 shrink-0">4:05 PM</span>
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {isOnline ? "Active now" : "Offline"}
                      </div>
                    </div>
                    {unread[id] ? <span className="w-5 h-5 rounded-full bg-[#ff6600] text-black flex items-center justify-center text-[10px] font-bold shrink-0">{unread[id]}</span> : null}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {/* Calls list */}
              {room && (
                <>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-2">Ongoing Call</div>
                  <button onClick={() => setMinimized(false)} className="w-full text-left p-3 mb-3 rounded-2xl flex gap-3 transition-colors items-center bg-[#1a110a] border border-[#ff6600]/30">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-[#ff6600]/20 text-[#ff6600] flex items-center justify-center border border-[#ff6600]/30 shrink-0">
                        <PhoneCall className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-white truncate">Active Team Call</div>
                      <div className="text-[11px] text-green-400 truncate flex items-center gap-1">
                        In progress...
                      </div>
                    </div>
                    <Video className="w-4 h-4 text-green-500" />
                  </button>
                </>
              )}

              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-2">Team Members</div>
              {recentCalls.map((a) => (
                <div key={a.adminId} className="w-full p-3 mb-1 rounded-2xl flex gap-3 items-center hover:bg-[#111] transition-colors cursor-pointer">
                  <div className="relative">
                    {getAvatar(a.adminName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-[13px] font-bold text-white truncate">{a.adminName}</span>
                      <span className={`text-[10px] shrink-0 ${online.some(member => member.adminId === a.adminId) ? "text-green-500" : "text-gray-500"}`}>
                        {online.some(member => member.adminId === a.adminId) ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="text-[11px] truncate flex items-center gap-1">
                      <PhoneOutgoing className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-400">Start a team call</span>
                    </div>
                  </div>
                    <button onClick={start} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center shrink-0" aria-label={`Start a team call with ${a.adminName}`}>
                      <Video className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Floating Minimized Call Pill */}
        {room && minimized && (
          <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] rounded-2xl p-3 flex items-center justify-between border border-[#333] shadow-2xl z-50">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMinimized(false)}>
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <Video className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">Active Call</div>
                <div className="text-[9px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Tap to expand
                </div>
              </div>
            </div>
            <button onClick={closeRoom} className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors">
              <PhoneOff className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </aside>

      {/* RIGHT COLUMN: MAIN CONTENT (CHAT OR CALL) */}
      <section className={`${mobileList ? "hidden" : "flex"} md:flex flex-1 flex-col min-w-0 bg-[#0A0A0A] relative`}>
        
        {room && !minimized ? (
          // CALL UI MAXIMIZED
          <div className="absolute inset-0 z-40 bg-[#050505] flex flex-row">
            
            {/* Main Stage */}
            <div className="flex-1 flex flex-col relative m-4 rounded-3xl overflow-hidden border border-[#1a1a1a] bg-black">
              <div className="absolute top-4 w-full flex justify-center z-10">
                <div className="flex items-center gap-1.5 text-green-500/80 text-[10px] font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                  <Lock className="w-3 h-3" /> End-to-end encrypted
                </div>
              </div>
              
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl text-white z-10 border border-white/5">
                <div className="text-xs font-bold">Team Call</div>
                <div className="text-green-400 text-[10px] flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                </div>
              </div>
              
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {!stream.current && (
                  <button type="button" onClick={() => void join(room, true)} className="h-10 rounded-xl bg-[#ff6600] px-4 text-xs font-bold text-black transition-colors hover:bg-[#ff8126]">
                    Join call
                  </button>
                )}
                <button onClick={() => setMinimized(true)} className="w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-colors border border-white/5">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Videos */}
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center p-8 gap-4 bg-gradient-to-b from-[#111] to-[#000]">
                {/* Remote Videos */}
                {Object.keys(remote).length === 0 && (
                  <div className="flex flex-col items-center justify-center text-gray-500 animate-pulse">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Waiting for others to join...</p>
                  </div>
                )}
                {Object.entries(remote).map(([id, s]) => (
                  <div key={id} className="relative w-full max-w-2xl aspect-video bg-[#1a1a1a] rounded-3xl overflow-hidden border border-[#333] shadow-2xl shadow-black">
                    <video autoPlay playsInline ref={v => { if (v) v.srcObject = s }} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {/* Local PIP */}
              <div className="absolute bottom-28 right-6 w-48 aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/10 z-20 shadow-2xl">
                <video ref={localVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] text-white backdrop-blur">You</div>
              </div>

              {/* Controls Dock */}
              <div className="absolute bottom-6 w-full flex justify-center z-30">
                <div className="bg-[#111111]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex gap-4 items-center shadow-2xl">
                  <button onClick={() => { stream.current?.getAudioTracks().forEach(t => t.enabled = muted); setMuted(x => !x) }} className={`flex flex-col items-center gap-1.5 w-14 ${muted ? "text-red-500" : "text-gray-300 hover:text-white"}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? "bg-red-500/20" : "bg-[#222] hover:bg-[#333]"}`}>
                      {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <span className="text-[9px] font-medium">Mute</span>
                  </button>
                  <button onClick={() => toast({title:"Camera can be chosen before joining"})} className={`flex flex-col items-center gap-1.5 w-14 ${!camera ? "text-red-500" : "text-gray-300 hover:text-white"}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${!camera ? "bg-red-500/20" : "bg-[#222] hover:bg-[#333]"}`}>
                      {!camera ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </div>
                    <span className="text-[9px] font-medium">Camera</span>
                  </button>
                  <button type="button" onClick={() => toast({ title: "Screen sharing", description: "Screen sharing will be available after a dedicated media-room upgrade." })} className="flex flex-col items-center gap-1.5 w-14 text-gray-300 hover:text-white">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#222] hover:bg-[#333]">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-medium">Share</span>
                  </button>
                  <button type="button" onClick={() => toast({ title: `${members.length} participant${members.length === 1 ? "" : "s"} in this room` })} className="flex flex-col items-center gap-1.5 w-14 text-gray-300 hover:text-white">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#222] hover:bg-[#333]">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-medium">People</span>
                  </button>
                  <div className="w-[1px] h-10 bg-white/10 mx-2" />
                  <button onClick={closeRoom} className="flex flex-col items-center gap-1.5 w-14">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">
                      <PhoneOff className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-red-500">End Call</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar - In-call info */}
            <div className="w-72 border-l border-[#1a1a1a] bg-[#0A0A0A] flex flex-col p-5 hidden lg:flex relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Video Call</div>
                  <div className="text-[10px] text-gray-400">Team Session</div>
                  <div className="text-green-500 text-[10px] font-bold tracking-wider uppercase mt-0.5">Live</div>
                </div>
              </div>

              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-3">Participants ({members.length})</div>
              <div className="space-y-3 mb-6">
                {members.map(m => {
                  const admin = admins.find(a => a.adminId === m);
                  return (
                    <div key={m} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAvatar(admin?.adminName || "User")}
                        <div>
                          <div className="text-xs font-bold text-white">{admin?.adminName || "User"} {m === me?.adminId ? "(You)" : ""}</div>
                          <div className="text-[9px] text-gray-400">Online</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 mb-8">
                <button type="button" onClick={() => toast({ title: "Team invitations", description: "All available admins are invited automatically when a room starts." })} className="flex-1 flex flex-col items-center justify-center py-3 bg-[#111] hover:bg-[#1a1a1a] transition-colors rounded-xl text-gray-400 hover:text-white text-[10px]">
                  <UserPlus className="w-4 h-4 mb-1.5" /> Add Person
                </button>
                <button type="button" onClick={() => toast({ title: "Secure team room", description: `${members.length} participant${members.length === 1 ? "" : "s"} currently connected.` })} className="flex-1 flex flex-col items-center justify-center py-3 bg-[#111] hover:bg-[#1a1a1a] transition-colors rounded-xl text-gray-400 hover:text-white text-[10px]">
                  <Info className="w-4 h-4 mb-1.5" /> Call Info
                </button>
              </div>

              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-3">In-Call Chat</div>
              <div className="flex-1 overflow-auto bg-[#050505] rounded-xl border border-[#1a1a1a] p-3 space-y-2">
                {messages.slice(-3).map((message) => {
                  const isMe = message.senderId === me?.adminId;
                  return (
                    <div key={message.id || message.clientMessageId} className={`max-w-[90%] rounded-xl px-2.5 py-2 text-[10px] ${isMe ? "ml-auto bg-[#ff6600] text-black" : "bg-[#1b1b1b] text-gray-200"}`}>
                      {!isMe && <p className="mb-0.5 font-bold text-[#ff8c42]">{message.senderName}</p>}
                      <p>{message.message}</p>
                      <p className={`mt-1 text-right text-[8px] ${isMe ? "text-black/55" : "text-gray-500"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="flex h-full items-center justify-center text-center text-[10px] text-gray-500">Your group conversation will appear here.</div>}
              </div>
              <form onSubmit={e => { e.preventDefault(); void send(); }} className="mt-3 bg-[#111] rounded-full px-3 py-2 flex items-center gap-2 border border-[#222]">
                <input value={text} onChange={event => { setText(event.target.value); void typingPost(true); }} onBlur={() => void typingPost(false)} className="bg-transparent border-none text-xs text-white flex-1 outline-none placeholder:text-gray-600" placeholder="Type a message..." />
                <button type="submit" className="text-[#ff6600]" aria-label="Send in-call message"><Send className="w-4 h-4" /></button>
              </form>
            </div>
          </div>
        ) : isCalls ? (
          <div className="flex-1 flex items-center justify-center bg-[#050505] p-5">
            <div className="w-full max-w-lg rounded-3xl border border-[#1d1d1d] bg-[#0c0c0c] px-8 py-12 text-center shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ff6600]">
                <Video className="h-7 w-7" />
              </div>
              <p className="mt-6 text-lg font-bold text-white">Ready to call your team?</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">Start one secure room for every available FirstPick admin. The live call will open here with its participant panel and in-call chat.</p>
              <button type="button" onClick={start} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff6600] px-5 text-sm font-bold text-black transition-colors hover:bg-[#ff8126]">
                <Video className="h-4 w-4" /> Start video call
              </button>
            </div>
          </div>
        ) : (
          // CHAT UI
          <div className="flex-1 flex flex-col h-full bg-[#0A0A0A]">
            <header className="h-16 px-6 flex items-center justify-between border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-gray-400 mr-2" onClick={() => setMobileList(true)} aria-label="Back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {conversation === "group" ? (
                  <div className="w-10 h-10 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-gray-400">
                    <Users className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="relative">
                    {getAvatar(directName(conversation))}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {conversation === "group" ? "# Admin team" : directName(conversation)}
                  </div>
                  <div className="text-[11px] text-green-400">
                    {conversation === "group" ? `${online.length} online` : "Online"}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-5 text-gray-400">
                <button className="hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
                <button onClick={start} className="hover:text-white transition-colors text-orange-500"><Phone className="w-5 h-5" /></button>
                <button onClick={start} className="hover:text-white transition-colors text-orange-500"><Video className="w-5 h-5" /></button>
                <div className="w-[1px] h-5 bg-[#222]" />
                <button className="hover:text-white transition-colors"><Info className="w-5 h-5" /></button>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="flex justify-center mb-6">
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[10px] font-medium text-gray-400 border border-[#222]">
                  Today
                </span>
              </div>

              {messages.map(m => {
                const isMe = m.senderId === me?.adminId;
                return (
                  <div key={m.id || m.clientMessageId} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-md text-[13px] relative group ${
                      isMe 
                        ? "bg-[#ff6600] text-black rounded-br-sm" 
                        : "bg-[#1a1a1a] text-gray-200 border border-[#222] rounded-bl-sm"
                    }`}>
                      {!isMe && conversation === "group" && (
                        <div className="text-[10px] font-bold text-orange-500 mb-1">{m.senderName}</div>
                      )}
                      <div className="whitespace-pre-wrap">{m.message}</div>
                      <div className={`text-[9px] mt-1 flex justify-end items-center gap-1 ${isMe ? "text-black/60" : "text-gray-500"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {isMe && <span className="text-[9px]">✓✓</span>}
                      </div>
                      
                      {/* Reactions */}
                      {Object.keys(m.reactions).length > 0 && (
                        <div className={`absolute -bottom-3 ${isMe ? "right-2" : "left-2"} bg-[#222] border border-[#333] rounded-full px-1.5 py-0.5 flex gap-1 shadow-lg`}>
                          {Object.entries(m.reactions).map(([e, ids]) => (
                            <span key={e} className="text-[10px] flex items-center gap-0.5">{e} <span className="text-gray-400">{ids.length}</span></span>
                          ))}
                        </div>
                      )}
                      
                      {/* Hover Actions */}
                      {m.id && (
                        <button onClick={() => react(m.id!, "👍")} className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-white`}>
                          <Smile className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {typing.length > 0 && (
                <div className="flex gap-2 justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-[#1a1a1a] text-gray-400 border border-[#222] rounded-bl-sm text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-[#0A0A0A] border-t border-[#1a1a1a]">
              <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-center gap-3 bg-[#111111] rounded-full px-4 py-2 border border-[#222]">
                <button type="button" className="text-gray-400 hover:text-white transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  value={text} 
                  onChange={e => { setText(e.target.value); typingPost(true) }} 
                  onBlur={() => typingPost(false)} 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-600" 
                  placeholder="Type a message..." 
                />
                <button type="button" className="text-gray-400 hover:text-white transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                {text.trim() ? (
                  <button type="submit" className="w-8 h-8 rounded-full bg-[#ff6600] flex items-center justify-center text-black ml-1 hover:bg-[#ff8833] transition-colors shadow-lg">
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                ) : (
                  <button type="button" className="text-[#ff6600] hover:text-[#ff8833] transition-colors ml-1">
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}