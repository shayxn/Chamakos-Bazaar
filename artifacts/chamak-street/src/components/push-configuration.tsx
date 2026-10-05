import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
const base=import.meta.env.BASE_URL.replace(/\/$/,"");
export default function PushConfiguration(){
  const [contact,setContact]=useState("");
  const [alerts,setAlerts]=useState(false);
  const q=useQuery<Record<string,string>>({queryKey:["push-config"],queryFn:async()=>{const r=await fetch(`${base}/api/admin/settings`,{credentials:"include"});if(!r.ok)throw new Error("Owner access required.");return r.json();}});
  useEffect(()=>{if(q.data){setContact(q.data.push_contact||"");setAlerts(q.data.owner_activity_push==="true");}},[q.data]);
  const save=useMutation({mutationFn:async()=>{
    const normalized=contact.trim().includes("@")&&!contact.trim().startsWith("mailto:")?`mailto:${contact.trim()}`:contact.trim();
    if(!/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(normalized))throw new Error("Enter your real contact email or HTTPS website.");
    const r=await fetch(`${base}/api/settings/bulk`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({push_contact:normalized,owner_activity_push:String(alerts)})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Configuration could not be saved.");return d;
  }});
  return <section className="space-y-4 rounded-2xl border border-primary/30 bg-white/[0.035] p-6">
    <h2 className="text-sm font-bold uppercase tracking-wider">Push configuration · owner only</h2>
    <p className="text-sm text-white/60">Set a real contact for the browser push service before enabling notifications. This is not an API key. Browser permission and a saved device subscription are still required.</p>
    <label className="block text-sm">Push contact email or HTTPS website<input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Your business contact" className="mt-2 w-full rounded-lg border border-primary/30 bg-black/50 p-3"/></label>
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={alerts} onChange={e=>setAlerts(e.target.checked)} className="accent-violet-500"/>Send important Admin activity alerts to owner devices</label>
    {(save.error||q.error)&&<p role="alert" className="text-sm text-red-300">{(save.error||q.error)?.message}</p>}
    {save.isSuccess&&<p role="status" className="text-sm text-primary">Push configuration saved. You can now enable notifications on this device.</p>}
    <button disabled={save.isPending||q.isLoading} onClick={()=>save.mutate()} className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-black">{save.isPending?"Saving…":"Save push configuration"}</button>
  </section>;
}
