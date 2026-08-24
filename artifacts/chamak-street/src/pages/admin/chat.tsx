import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Send, Users,
  Minimize2, Maximize2, Search, Video, Info, Paperclip, Smile, Lock,
  UserPlus, Monitor, SquarePen, ArrowLeft, PhoneCall, PhoneOutgoing,
  ImageIcon, Loader2, Square, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
type Admin={adminId:string;adminName:string}; 
type RoomDevice={adminId:string;deviceId:string};
type ChatMedia={kind:"image"|"audio";objectPath:string;contentType?:string;name?:string;durationSeconds?:number};
type Message={id?:number;senderId:string;senderName:string;message:string;type?:"text"|"image"|"audio";metadata?:{media?:ChatMedia}|null;conversationId:string;createdAt:string;reactions:Record<string,string[]>;clientMessageId?:string};

const initials = (s:string) => s.slice(0,2).toUpperCase();
const dm = (a:string,b:string) => `dm:${[a,b].sort((x,y) => Number(x)-Number(y)).join(":")}`;
const EMOJIS = ["😀","😂","🔥","❤️","👍","👏","🎉","🙏","💯","👀","😎","🤝"];

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
  const [sharing,setSharing]=useState(false);
  const [emojiOpen,setEmojiOpen]=useState(false);
  const [uploadingMedia,setUploadingMedia]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recordSeconds,setRecordSeconds]=useState(0);
  const device=useRef(crypto.randomUUID());
  const es=useRef<EventSource|null>(null); 
  const stream=useRef<MediaStream|null>(null); 
  const cameraTrack=useRef<MediaStreamTrack|null>(null);
  const screenTrack=useRef<MediaStreamTrack|null>(null);
  const cameraState=useRef(false);
  const sharingState=useRef(false);
  const restoreCameraAfterShare=useRef(false);
  const roomRef=useRef<string|null>(null);
  const joinedRoomRef=useRef<string|null>(null);
  const pcs=useRef(new Map<string,RTCPeerConnection>());
  const pendingIce=useRef(new Map<string, RTCIceCandidateInit[]>());
  const videos=useRef(new Map<string,MediaStream>());
  const [remote,setRemote]=useState<Record<string,MediaStream>>({});
  const localVideo=useRef<HTMLVideoElement>(null); 
  const ice=useRef<RTCIceServer[]>([{urls:"stun:stun.l.google.com:19302"}]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef("group");
  const loadVersion = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder|null>(null);
  const recorderStream = useRef<MediaStream|null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRecording = useRef(false);

  const load=useCallback(async(id:string)=>{const version=++loadVersion.current;const r=await fetch(`${BASE}/api/admin/chat/messages?conversationId=${encodeURIComponent(id)}`,{credentials:"include"});const data=r.ok?await r.json():null;if(data&&version===loadVersion.current)setMessages(data);},[]);
  useEffect(()=>{fetch(`${BASE}/api/admin/chat/conversations`,{credentials:"include"}).then(r=>r.ok?r.json():null).then(d=>{if(d){setMe({adminId:d.me.id,adminName:d.me.name});setAdmins(d.admins);}});fetch(`${BASE}/api/admin/chat/ice-config`,{credentials:"include"}).then(r=>r.json()).then(d=>{if(d.iceServers)ice.current=d.iceServers}).catch(()=>{});},[]);
  useEffect(()=>{const invited=new URLSearchParams(window.location.search).get("room");if(invited){roomRef.current=invited;setRoom(invited);}},[]);
  useEffect(()=>{const activeConversation=conversation;conversationRef.current=conversation;load(conversation);setTyping([]);return()=>{if(typingTimer.current)clearTimeout(typingTimer.current);if(typingActive.current){typingActive.current=false;fetch(`${BASE}/api/admin/chat/typing`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({typing:false,conversationId:activeConversation})}).catch(()=>{});}};},[conversation,load]);
  useEffect(() => { const frame=requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" })); return () => cancelAnimationFrame(frame); }, [messages.length]);

  const closeRoom=useCallback(async()=>{const id=roomRef.current;const wasJoined=joinedRoomRef.current===id;roomRef.current=null;joinedRoomRef.current=null;for(const pc of pcs.current.values())pc.close();pcs.current.clear();pendingIce.current.clear();videos.current.clear();cameraTrack.current?.stop();screenTrack.current?.stop();cameraTrack.current=null;screenTrack.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;cameraState.current=false;sharingState.current=false;setRemote({});setRoom(null);setMembers([]);setCamera(false);setSharing(false);if(id&&wasJoined)fetch(`${BASE}/api/admin/chat/rooms/${id}/leave?deviceId=${encodeURIComponent(device.current)}`,{method:"POST",credentials:"include"}).catch(()=>{});},[]);
  const sendSignal=useCallback(async(id:string,to:string,toDeviceId:string,signal:any)=>{const response=await fetch(`${BASE}/api/admin/chat/rooms/${id}/signal`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({to,toDeviceId,signal,deviceId:device.current})});if(!response.ok)throw new Error("Call signaling failed");},[]);
  const replaceVideoTrack=useCallback(async(track:MediaStreamTrack|null)=>{await Promise.all([...pcs.current.values()].map(async pc=>{const sender=pc.getSenders().find(item=>item.track?.kind==="video");if(sender)await sender.replaceTrack(track);else if(track&&stream.current)pc.addTrack(track,stream.current);}));},[]);
  const stopScreenShare=useCallback(async()=>{const track=screenTrack.current;if(!track)return;screenTrack.current=null;track.onended=null;track.stop();if(stream.current)stream.current.removeTrack(track);const shouldRestore=restoreCameraAfterShare.current;restoreCameraAfterShare.current=false;const next=shouldRestore?cameraTrack.current:null;if(next){next.enabled=true;if(stream.current&&!stream.current.getVideoTracks().includes(next))stream.current.addTrack(next);}await replaceVideoTrack(next);if(localVideo.current&&stream.current)localVideo.current.srcObject=stream.current;cameraState.current=shouldRestore;sharingState.current=false;setCamera(shouldRestore);setSharing(false);},[replaceVideoTrack]);
  const toggleCamera=useCallback(async()=>{if(!stream.current||!joinedRoomRef.current){toast({title:"Join the call first",description:"Camera controls become available once you are connected."});return;}if(sharingState.current)await stopScreenShare();if(cameraState.current){if(cameraTrack.current)cameraTrack.current.enabled=false;await replaceVideoTrack(null);cameraState.current=false;setCamera(false);return;}let track=cameraTrack.current;if(!track||track.readyState==="ended"){const next=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}},audio:false});track=next.getVideoTracks()[0]??null;cameraTrack.current=track;if(track&&stream.current&&!stream.current.getVideoTracks().includes(track))stream.current.addTrack(track);}if(!track){toast({title:"Camera unavailable",description:"Allow camera access in your browser to turn video on.",variant:"destructive"});return;}track.enabled=true;await replaceVideoTrack(track);if(localVideo.current&&stream.current)localVideo.current.srcObject=stream.current;cameraState.current=true;setCamera(true);},[replaceVideoTrack,stopScreenShare,toast]);
  const toggleScreenShare=useCallback(async()=>{if(sharingState.current){await stopScreenShare();return;}if(!stream.current){toast({title:"Join the call first",description:"Screen sharing is available after your microphone is connected."});return;}try{const display=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:24,max:30}},audio:false});const track=display.getVideoTracks()[0];if(!track)return;restoreCameraAfterShare.current=cameraState.current;cameraTrack.current&&(cameraTrack.current.enabled=false);const currentCamera=stream.current.getVideoTracks()[0];if(currentCamera)stream.current.removeTrack(currentCamera);stream.current.addTrack(track);screenTrack.current=track;await replaceVideoTrack(track);if(localVideo.current)localVideo.current.srcObject=stream.current;sharingState.current=true;cameraState.current=false;setSharing(true);setCamera(false);track.onended=()=>{void stopScreenShare();};}catch(error){if(error instanceof DOMException&&error.name==="AbortError")return;toast({title:"Screen sharing unavailable",description:"Your browser could not start screen sharing.",variant:"destructive"});}},[replaceVideoTrack,stopScreenShare,toast]);
  const peer=useCallback(async(remoteDevice:RoomDevice,id:string,offer:boolean)=>{
    if(!stream.current)return; const peerId=`${remoteDevice.adminId}:${remoteDevice.deviceId}`;const pc=new RTCPeerConnection({iceServers:ice.current});pcs.current.set(peerId,pc);stream.current.getTracks().forEach(t=>pc.addTrack(t,stream.current!));
    pc.onicecandidate=e=>{if(e.candidate)sendSignal(id,remoteDevice.adminId,remoteDevice.deviceId,{type:"ice",candidate:e.candidate}).catch(()=>{})};
    pc.ontrack=e=>{const s=e.streams[0]||new MediaStream([e.track]);videos.current.set(peerId,s);setRemote(Object.fromEntries(videos.current));};
    pc.onconnectionstatechange=()=>{if(["failed","closed"].includes(pc.connectionState)){pcs.current.delete(peerId);videos.current.delete(peerId);setRemote(Object.fromEntries(videos.current));}};
    if(offer){const o=await pc.createOffer();await pc.setLocalDescription(o);await sendSignal(id,remoteDevice.adminId,remoteDevice.deviceId,{type:"offer",offer:o});} return pc;
  },[sendSignal]);
  const flushPendingIce=useCallback(async(peerId:string,pc:RTCPeerConnection)=>{if(!pc.remoteDescription)return;const queued=pendingIce.current.get(peerId);if(!queued?.length)return;pendingIce.current.delete(peerId);for(const candidate of queued){try{await pc.addIceCandidate(candidate);}catch{}}},[]);
  const connectToMembers=useCallback(async(id:string,devices:RoomDevice[])=>{if(!me||!stream.current)return;const mine=`${me.adminId}:${device.current}`;for(const remoteDevice of devices){const peerId=`${remoteDevice.adminId}:${remoteDevice.deviceId}`;if(peerId!==mine&&mine.localeCompare(peerId)<0&&!pcs.current.has(peerId))await peer(remoteDevice,id,true);}},[me,peer]);

  useEffect(()=>{
    if(!me)return;
    const source=new EventSource(`${BASE}/api/admin/chat/stream?deviceId=${device.current}`,{withCredentials:true});
    es.current=source;
    source.onmessage=async e=>{
      const d=JSON.parse(e.data);
      if(d.type==="PRESENCE")setOnline(d.onlineAdmins||[]);
      if(d.type==="MESSAGE"){if(d.message.conversationId===conversationRef.current)setMessages(p=>p.some(x=>x.id===d.message.id)?p:[...p,d.message]);else setUnread(p=>({...p,[d.message.conversationId]:(p[d.message.conversationId]||0)+1}));}
      if(d.type==="REACTION"&&d.conversationId===conversationRef.current)setMessages(p=>p.map(x=>x.id===d.messageId?{...x,reactions:d.reactions}:x));
      if(d.type==="TYPING"&&d.conversationId===conversationRef.current&&d.adminId!==me.adminId)setTyping(p=>d.typing?[...new Set([...p,d.adminName])]:p.filter(x=>x!==d.adminName));
      if(d.type==="ROOM_INVITE"){if(roomRef.current&&roomRef.current!==d.roomId)await closeRoom();toast({title:`Call from ${d.from.name}`,description:"Join the team room from the call bar."});roomRef.current=d.roomId;setRoom(d.roomId);setMembers([]);setMinimized(false);}
      if(d.type==="ROOM_MEMBERS"&&d.roomId===roomRef.current){setMembers(d.members);connectToMembers(d.roomId,d.devices||[]).catch(()=>{});}
       if(d.type==="ROOM_SIGNAL"&&d.roomId===roomRef.current){const remoteDevice={adminId:d.from,deviceId:d.fromDeviceId};const peerId=`${remoteDevice.adminId}:${remoteDevice.deviceId}`;let pc=pcs.current.get(peerId);if(d.signal.type==="offer"){pc=await peer(remoteDevice,d.roomId,false);await pc!.setRemoteDescription(d.signal.offer);await flushPendingIce(peerId,pc!);const answer=await pc!.createAnswer();await pc!.setLocalDescription(answer);await sendSignal(d.roomId,remoteDevice.adminId,remoteDevice.deviceId,{type:"answer",answer});}else if(pc&&d.signal.type==="answer"){await pc.setRemoteDescription(d.signal.answer);await flushPendingIce(peerId,pc);}else if(d.signal.type==="ice"){if(pc?.remoteDescription){try{await pc.addIceCandidate(d.signal.candidate);}catch{pendingIce.current.set(peerId,[...(pendingIce.current.get(peerId)??[]),d.signal.candidate]);}}else pendingIce.current.set(peerId,[...(pendingIce.current.get(peerId)??[]),d.signal.candidate]);}}
    };
    return()=>source.close();
  },[me,peer,sendSignal,connectToMembers,flushPendingIce,toast]);
  useEffect(()=>()=>{closeRoom();},[closeRoom]);
  useEffect(()=>()=>{if(typingTimer.current)clearTimeout(typingTimer.current);},[]);
  useEffect(()=>()=>{cancelRecording.current=true;recorder.current?.state==="recording"&&recorder.current.stop();recorderStream.current?.getTracks().forEach(track=>track.stop());if(recordingTimer.current)clearInterval(recordingTimer.current);},[]);
  useEffect(()=>{const leaveOnPageHide=()=>{const id=roomRef.current;if(id&&joinedRoomRef.current===id){roomRef.current=null;joinedRoomRef.current=null;fetch(`${BASE}/api/admin/chat/rooms/${id}/leave?deviceId=${encodeURIComponent(device.current)}`,{method:"POST",credentials:"include",keepalive:true}).catch(()=>{});}};window.addEventListener("pagehide",leaveOnPageHide);return()=>window.removeEventListener("pagehide",leaveOnPageHide);},[]);
  
  const select=(id:string)=>{setConversation(id);setUnread(p=>{const next={...p};delete next[id];return next});setMobileList(false)};
  const send=async(input?:{message?:string;type?:"text"|"image"|"audio";metadata?:{media:ChatMedia}})=>{
    if(!me)return;
    const message=input?.message??text;
    const type=input?.type??"text";
    if(type==="text"&&!message.trim())return;
    const body={message,type,metadata:input?.metadata,conversationId:conversation,clientMessageId:crypto.randomUUID()};
    if(!input)setText("");
    const r=await fetch(`${BASE}/api/admin/chat/messages`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){
      if(!input)setText(message);
      const data=await r.json().catch(()=>null) as {error?:string}|null;
      toast({title:"Message not sent",description:data?.error,variant:"destructive"});
      throw new Error(data?.error||"Message not sent");
    }
  };
  const uploadAndSend=useCallback(async(file:File,kind:"image"|"audio")=>{
    setUploadingMedia(true);
    try{
      const request=await fetch(`${BASE}/api/admin/chat/uploads/request-url`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:file.name,size:file.size,contentType:file.type})});
      const upload=await request.json().catch(()=>null) as {uploadURL?:string;objectPath?:string;error?:string}|null;
      if(!request.ok||!upload?.uploadURL||!upload.objectPath)throw new Error(upload?.error||"Could not prepare media upload");
      const put=await fetch(upload.uploadURL,{method:"PUT",headers:{"Content-Type":file.type},body:file});
      if(!put.ok)throw new Error("Media upload did not complete");
      await send({type:kind,message:"",metadata:{media:{kind,objectPath:upload.objectPath,contentType:file.type,name:file.name}}});
    }catch(error){
      toast({title:kind==="image"?"Photo not sent":"Voice message not sent",description:error instanceof Error?error.message:undefined,variant:"destructive"});
    }finally{setUploadingMedia(false);}
  },[toast]);
  const selectPhoto=(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){
      toast({title:"Choose a photo",description:"Only image files can be sent here.",variant:"destructive"});
      return;
    }
    void uploadAndSend(file,"image");
  };
  const stopRecording=()=>{if(recorder.current?.state==="recording")recorder.current.stop();};
  const startRecording=async()=>{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      toast({title:"Voice messages unavailable",description:"This browser does not support audio recording.",variant:"destructive"});
      return;
    }
    try{
      const source=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"";
      const active=new MediaRecorder(source,mimeType?{mimeType}:undefined);
      recorderStream.current=source;
      recordingChunks.current=[];
      cancelRecording.current=false;
      active.ondataavailable=e=>{if(e.data.size)recordingChunks.current.push(e.data);};
      active.onstop=()=>{
        const shouldCancel=cancelRecording.current;
        const type=active.mimeType||"audio/webm";
        const blob=new Blob(recordingChunks.current,{type});
        source.getTracks().forEach(track=>track.stop());
        recorder.current=null;
        recorderStream.current=null;
        if(recordingTimer.current)clearInterval(recordingTimer.current);
        setRecording(false);
        setRecordSeconds(0);
        if(!shouldCancel&&blob.size)void uploadAndSend(new File([blob],`voice-message-${Date.now()}.webm`,{type}),"audio");
      };
      recorder.current=active;
      setRecordSeconds(0);
      setRecording(true);
      recordingTimer.current=setInterval(()=>setRecordSeconds(value=>value+1),1000);
      active.start();
    }catch{
      toast({title:"Microphone access needed",description:"Allow microphone access to record a voice message.",variant:"destructive"});
    }
  };
  const cancelVoice=()=>{cancelRecording.current=true;stopRecording();};
  const typingPost=(active:boolean)=>{if(typingTimer.current)clearTimeout(typingTimer.current);if(active&&typingActive.current){typingTimer.current=setTimeout(()=>typingPost(false),1400);return;}if(typingActive.current===active)return;typingActive.current=active;fetch(`${BASE}/api/admin/chat/typing`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({typing:active,conversationId:conversationRef.current})}).catch(()=>{});if(active)typingTimer.current=setTimeout(()=>typingPost(false),1400);};
  const react=async(id:number,emoji:string)=>{const r=await fetch(`${BASE}/api/admin/chat/messages/${id}/react`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({emoji})});if(!r.ok)toast({title:"Reaction could not be saved",variant:"destructive"});};
  
  const join=async(id:string,withVideo=camera)=>{try{const s=await navigator.mediaDevices.getUserMedia({audio:true,video:withVideo?{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}:false});stream.current=s;cameraTrack.current=s.getVideoTracks()[0]??null;cameraState.current=withVideo;setCamera(withVideo);if(localVideo.current)localVideo.current.srcObject=s;roomRef.current=id;setRoom(id);setMinimized(false);const r=await fetch(`${BASE}/api/admin/chat/rooms/${id}/join`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId:device.current})});if(!r.ok)throw new Error("The room has ended");joinedRoomRef.current=id;const d=await r.json();setMembers(d.members);await connectToMembers(id,d.devices||[]);}catch(e){await closeRoom();toast({title:"Unable to join call",description:e instanceof Error?e.message:"Allow microphone access.",variant:"destructive"});}};
  const start=async()=>{const r=await fetch(`${BASE}/api/admin/chat/rooms`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId:device.current})});if(!r.ok){toast({title:"Could not start call",variant:"destructive"});return;}const d=await r.json();roomRef.current=d.roomId;joinedRoomRef.current=d.roomId;await join(d.roomId,true);};
  const directName=(id:string)=>admins.find(a=>a.adminId!==(me?.adminId) && id.includes(`:${a.adminId}`))?.adminName||"Direct message";
  const getAvatar=(name:string)=>{return <div className="w-10 h-10 rounded-full bg-[#111111] text-gray-300 flex items-center justify-center text-sm font-bold border border-[#222] shrink-0">{initials(name)}</div>};

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // Calls UI state mock data
  const recentCalls = admins.filter(a => a.adminId !== me?.adminId).slice(0, 5);

  return (
    <div className="h-full min-h-0 w-full flex overflow-hidden bg-[#000000] text-white">
      {/* LEFT COLUMN: CHATS / CALLS LIST */}
      <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, ease: "easeOut" }} className={`${mobileList ? "flex" : "hidden"} md:flex w-full max-w-full md:w-[320px] shrink-0 min-h-0 flex-col border-r border-[#1a1a1a] bg-[#0A0A0A] relative`}>
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
                  <motion.button 
                    whileHover={{ x: 3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.button>
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
                <motion.div key={a.adminId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(0.24, Number(a.adminId) * 0.02) }} whileHover={{ x: 3 }} className="w-full p-3 mb-1 rounded-2xl flex gap-3 items-center hover:bg-[#111] transition-colors cursor-pointer">
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
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* Floating Minimized Call Pill */}
        <AnimatePresence>
        {room && minimized && (
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] rounded-2xl p-3 flex items-center justify-between border border-[#333] shadow-2xl z-50">
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
          </motion.div>
        )}
        </AnimatePresence>
      </motion.aside>

      {/* RIGHT COLUMN: MAIN CONTENT (CHAT OR CALL) */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className={`${mobileList ? "hidden" : "flex"} md:flex flex-1 flex-col min-h-0 min-w-0 bg-[#0A0A0A] relative`}>
        
        {room && !minimized ? (
          // CALL UI MAXIMIZED
          <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} className="absolute inset-0 z-40 bg-[#050505] flex flex-row">
            
            {/* Main Stage */}
            <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06, duration: 0.32, ease: "easeOut" }} className="flex-1 flex min-h-0 min-w-0 flex-col relative m-2 sm:m-4 rounded-3xl overflow-hidden border border-[#1a1a1a] bg-black">
              <motion.div aria-hidden className="absolute -top-1/3 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#ff6600]/10 blur-3xl" animate={{ opacity: [0.18, 0.42, 0.18], scale: [0.92, 1.08, 0.92] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
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
              <div className="w-full h-full min-h-0 flex flex-col sm:flex-row items-center justify-center p-3 sm:p-8 gap-3 sm:gap-4 bg-gradient-to-b from-[#111] to-[#000]">
                {/* Remote Videos */}
                {Object.keys(remote).length === 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex flex-col items-center justify-center text-gray-500">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Waiting for others to join...</p>
                  </motion.div>
                )}
                {Object.entries(remote).map(([id, s]) => (
                  <motion.div key={id} initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 24 }} className="relative w-full max-w-2xl aspect-video bg-[#1a1a1a] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#333] shadow-2xl shadow-black">
                    <video autoPlay playsInline ref={v => { if (v) v.srcObject = s }} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>

              {/* Local PIP */}
              <motion.div initial={{ opacity: 0, scale: 0.78, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.18, type: "spring", stiffness: 320, damping: 24 }} className="absolute bottom-24 sm:bottom-28 right-3 sm:right-6 w-32 sm:w-48 aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 z-20 shadow-2xl">
                <video ref={localVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] text-white backdrop-blur">{sharing ? "Sharing screen" : "You"}</div>
              </motion.div>

              {/* Controls Dock */}
              <div className="absolute bottom-3 sm:bottom-6 left-2 right-2 sm:left-0 sm:right-0 flex justify-center z-30">
                <div className="max-w-full bg-[#111111]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-2 sm:px-6 py-2 sm:py-3 flex gap-1 sm:gap-4 items-center shadow-2xl">
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} onClick={() => { stream.current?.getAudioTracks().forEach(t => t.enabled = muted); setMuted(x => !x) }} className={`flex flex-col items-center gap-1 sm:gap-1.5 w-11 sm:w-14 ${muted ? "text-red-500" : "text-gray-300 hover:text-white"}`}>
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${muted ? "bg-red-500/20" : "bg-[#222] hover:bg-[#333]"}`}>
                      {muted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <span className="text-[9px] font-medium">Mute</span>
                  </motion.button>
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} onClick={() => void toggleCamera()} className={`flex flex-col items-center gap-1 sm:gap-1.5 w-11 sm:w-14 ${!camera ? "text-red-500" : "text-gray-300 hover:text-white"}`}>
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${!camera ? "bg-red-500/20" : "bg-[#222] hover:bg-[#333]"}`}>
                      {!camera ? <CameraOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Camera className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <span className="text-[9px] font-medium">{camera ? "Camera" : "Camera off"}</span>
                  </motion.button>
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} type="button" onClick={() => void toggleScreenShare()} className={`flex flex-col items-center gap-1 sm:gap-1.5 w-11 sm:w-14 ${sharing ? "text-[#ff6600]" : "text-gray-300 hover:text-white"}`}>
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${sharing ? "bg-[#ff6600]/20 ring-1 ring-[#ff6600]/50" : "bg-[#222] hover:bg-[#333]"}`}>
                      <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[9px] font-medium">{sharing ? "Stop share" : "Share"}</span>
                  </motion.button>
                  <button type="button" onClick={() => toast({ title: `${members.length} participant${members.length === 1 ? "" : "s"} in this room` })} className="flex flex-col items-center gap-1 sm:gap-1.5 w-11 sm:w-14 text-gray-300 hover:text-white">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#222] hover:bg-[#333]">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[9px] font-medium">People</span>
                  </button>
                  <div className="w-[1px] h-8 sm:h-10 bg-white/10 mx-0.5 sm:mx-2" />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={closeRoom} className="flex flex-col items-center gap-1 sm:gap-1.5 w-11 sm:w-14">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">
                      <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-red-500">End Call</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

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
          </motion.div>
        ) : isCalls ? (
          <div className="flex-1 flex items-center justify-center bg-[#050505] p-5 overflow-hidden">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="relative w-full max-w-lg rounded-3xl border border-[#1d1d1d] bg-[#0c0c0c] px-5 sm:px-8 py-10 sm:py-12 text-center shadow-2xl">
              <motion.div aria-hidden className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#ff6600]/20 blur-3xl" animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.25, 0.55, 0.25] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }} />
              <motion.div animate={{ rotate: [0, -4, 4, 0], y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ff6600]">
                <Video className="h-7 w-7" />
              </motion.div>
              <p className="mt-6 text-lg font-bold text-white">Ready to call your team?</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">Start one secure room for every available FirstPick admin. The live call will open here with its participant panel and in-call chat.</p>
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} type="button" onClick={start} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff6600] px-5 text-sm font-bold text-black transition-colors hover:bg-[#ff8126]">
                <Video className="h-4 w-4" /> Start video call
              </motion.button>
            </motion.div>
          </div>
        ) : (
          // CHAT UI
            <div className="flex-1 flex min-h-0 flex-col h-full bg-[#0A0A0A]">
              <header className="h-16 shrink-0 pl-16 pr-4 sm:px-6 flex items-center justify-between border-b border-[#1a1a1a]">
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

              <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex justify-center mb-6">
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[10px] font-medium text-gray-400 border border-[#222]">
                  Today
                </span>
              </div>

              {messages.map(m => {
                const isMe = m.senderId === me?.adminId;
                const media = m.metadata?.media;
                const mediaUrl = media ? `${BASE}/api/admin/chat/media/${media.objectPath}` : null;
                return (
                  <motion.div key={m.id || m.clientMessageId} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`px-3 sm:px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-md text-[13px] relative group ${
                      isMe 
                        ? "bg-[#ff6600] text-black rounded-br-sm" 
                        : "bg-[#1a1a1a] text-gray-200 border border-[#222] rounded-bl-sm"
                    }`}>
                      {!isMe && conversation === "group" && (
                        <div className="text-[10px] font-bold text-orange-500 mb-1">{m.senderName}</div>
                      )}
                      {m.type === "image" && mediaUrl ? (
                        <img src={mediaUrl} alt={m.message === "📷 Photo" ? "Shared photo" : m.message} className="max-h-80 w-auto max-w-full rounded-xl object-cover" loading="lazy" />
                      ) : m.type === "audio" && mediaUrl ? (
                        <div className="min-w-[220px]">
                          <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold ${isMe ? "text-black/65" : "text-orange-400"}`}><Mic className="h-3.5 w-3.5" /> Voice message</div>
                          <audio controls preload="metadata" className="h-9 w-full max-w-[260px]" src={mediaUrl}>Your browser cannot play this voice message.</audio>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{m.message}</div>
                      )}
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
                  </motion.div>
                );
              })}
              <AnimatePresence>
              {typing.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex gap-2 justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-[#1a1a1a] text-gray-400 border border-[#222] rounded-bl-sm text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150" />
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-4 bg-[#0A0A0A] border-t border-[#1a1a1a]">
              <form onSubmit={e => { e.preventDefault(); void send().catch(()=>{}); }} className="relative flex items-center gap-3 bg-[#111111] rounded-full px-4 py-2 border border-[#222]">
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value=""; }} />
                <button type="button" onClick={() => fileInput.current?.click()} disabled={uploadingMedia || recording} className="text-gray-400 hover:text-white transition-colors disabled:opacity-40" aria-label="Send a photo">
                  {uploadingMedia ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <ImageIcon className="w-5 h-5" />}
                </button>
                <input 
                  value={text} 
                  onChange={e => { setText(e.target.value); typingPost(true) }} 
                  onBlur={() => typingPost(false)} 
                  disabled={recording || uploadingMedia}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-600 disabled:opacity-50" 
                  placeholder={recording ? `Recording ${String(Math.floor(recordSeconds / 60)).padStart(2,"0")}:${String(recordSeconds % 60).padStart(2,"0")}` : uploadingMedia ? "Sending media…" : "Type a message…"} 
                />
                <button type="button" onClick={() => setEmojiOpen(value=>!value)} disabled={recording || uploadingMedia} className="text-gray-400 hover:text-white transition-colors disabled:opacity-40" aria-label="Choose an emoji">
                  <Smile className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {emojiOpen && (
                    <motion.div initial={{opacity:0,scale:.94,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:8}} className="absolute bottom-[calc(100%+0.5rem)] right-12 z-30 grid grid-cols-6 gap-1 rounded-2xl border border-[#333] bg-[#171717] p-2 shadow-2xl">
                      {EMOJIS.map(emoji => <button key={emoji} type="button" onClick={() => { setText(value=>value+emoji); setEmojiOpen(false); }} className="h-8 w-8 rounded-lg text-lg transition-colors hover:bg-white/10" aria-label={`Add ${emoji}`}>{emoji}</button>)}
                    </motion.div>
                  )}
                </AnimatePresence>
                {text.trim() ? (
                  <motion.button whileHover={{ scale: 1.1, rotate: -8 }} whileTap={{ scale: 0.9 }} type="submit" className="w-8 h-8 rounded-full bg-[#ff6600] flex items-center justify-center text-black ml-1 hover:bg-[#ff8833] transition-colors shadow-lg">
                    <Send className="w-4 h-4 ml-0.5" />
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-1">
                    {recording && <button type="button" onClick={cancelVoice} className="text-gray-400 hover:text-white transition-colors" aria-label="Discard voice message"><X className="w-4 h-4" /></button>}
                    <button type="button" onClick={recording ? stopRecording : () => void startRecording()} disabled={uploadingMedia} className={`${recording ? "bg-red-500 text-white animate-pulse" : "text-[#ff6600] hover:text-[#ff8833]"} flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40`} aria-label={recording ? "Stop and send voice message" : "Record a voice message"}>
                      {recording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}