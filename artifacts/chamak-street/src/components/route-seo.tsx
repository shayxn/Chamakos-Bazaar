import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSettings } from "@/lib/use-settings";
export default function RouteSeo(){
  const [path]=useLocation();
  const settings=useSettings();
  useEffect(()=>{
    const labels:Record<string,string>={"/shop":"Shop","/news":"News","/about":"Our Story","/support":"Support","/cart":"Bag","/checkout":"Checkout","/account":"Account","/wishlist":"Wishlist","/terms":"Policies","/order-tracking":"Track an order"};
    document.title=path==="/"?(settings.site_title||"IMAGINATE"):`${labels[path]||"IMAGINATE"} | IMAGINATE`;
    const meta=(key:string,value:string,property=false)=>{let e=document.head.querySelector<HTMLMetaElement>(`meta[${property?"property":"name"}="${key}"]`);if(!e){e=document.createElement("meta");e.setAttribute(property?"property":"name",key);document.head.appendChild(e);}e.content=value;};
    meta("description",settings.site_meta_description||"IMAGINATE — clothing and streetwear in the UAE.");
    meta("og:title",document.title,true);meta("og:description",settings.site_meta_description||"",true);
    meta("og:image",settings.site_og_image||new URL(`${import.meta.env.BASE_URL}imaginate-logo.png`,window.location.origin).href,true);
    meta("robots",/^\/(?:admin|account|checkout|cart|receipt|order\/|maintenance)/.test(path)?"noindex,nofollow":"index,follow");
    let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical);}
    canonical.href=new URL(`${import.meta.env.BASE_URL.replace(/\/$/,"")}${path}`,window.location.origin).href;
    meta("og:url",canonical.href,true);
  },[path,settings.site_title,settings.site_meta_description,settings.site_og_image]);
  return null;
}
