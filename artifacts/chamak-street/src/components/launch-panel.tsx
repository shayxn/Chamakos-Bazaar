import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function LaunchPanel() {
  const { data } = useQuery<{ id:number; title:string; data:{deadline?:string;headline?:string;text?:string;imageUrl?:string} }[]>({
    queryKey:["published","launch"],
    queryFn:async()=>{const r=await fetch(`${import.meta.env.BASE_URL.replace(/\/$/,"")}/api/published/launch`);if(!r.ok)throw new Error("Launch content unavailable");return r.json();},
    staleTime:30_000,
  });
  const [now,setNow]=useState(Date.now());
  const launch=data?.[0];
  const deadline=launch?.data.deadline && /(?:Z|[+-]\d{2}:\d{2})$/.test(launch.data.deadline) ? Date.parse(launch.data.deadline) : NaN;
  useEffect(()=>{if(!Number.isFinite(deadline))return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[deadline]);
  if(!launch)return null;
  const remaining=Math.max(0,deadline-now);
  const times=[Math.floor(remaining/86400000),Math.floor(remaining/3600000)%24,Math.floor(remaining/60000)%60,Math.floor(remaining/1000)%60];
  return <section className="mx-auto my-8 max-w-6xl overflow-hidden rounded-3xl border border-primary/30 bg-white/[0.035] p-6 sm:p-10">
    {launch.data.imageUrl&&<img src={launch.data.imageUrl} alt="" loading="lazy" className="mb-6 max-h-72 w-full object-cover rounded-2xl"/>}
    <h2 className="text-2xl font-bold">{launch.data.headline||launch.title}</h2>
    {launch.data.text&&<p className="mt-3 whitespace-pre-wrap text-white/65">{launch.data.text}</p>}
    {Number.isFinite(deadline)&&remaining>0&&<div className="mt-6 grid max-w-lg grid-cols-4 gap-3" aria-label="Launch countdown">{times.map((v,i)=><div key={i} className="rounded-xl border border-primary/25 p-3 text-center"><strong className="text-2xl tabular-nums">{String(v).padStart(2,"0")}</strong><p className="text-[10px] text-white/50">{["Days","Hours","Minutes","Seconds"][i]}</p></div>)}</div>}
  </section>;
}
