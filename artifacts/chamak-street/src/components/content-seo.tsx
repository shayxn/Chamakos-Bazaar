import { useEffect } from "react";
export function ContentSeo({title,description,image,product}:{title:string;description?:string;image?:string;product?:{name:string;price:number;stock:number;imageUrl?:string|null}}){
  useEffect(()=>{
    document.title=`${title} | IMAGINATE`;
    const set=(attribute:string,key:string,value?:string)=>{if(!value)return;let e=document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);if(!e){e=document.createElement("meta");e.setAttribute(attribute,key);document.head.appendChild(e);}e.content=value;};
    set("name","description",description);set("property","og:title",document.title);set("property","og:description",description);set("property","og:image",image?new URL(image,window.location.origin).href:undefined);
    set("name","twitter:title",document.title);set("name","twitter:description",description);set("name","twitter:image",image?new URL(image,window.location.origin).href:undefined);
    let script:HTMLScriptElement|undefined;
    if(product){
      script=document.createElement("script");script.type="application/ld+json";
      script.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Product",name:product.name,...(description?{description}:{}),...(image?{image}:{}),offers:{"@type":"Offer",price:product.price,priceCurrency:"AED",availability:product.stock>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",url:window.location.href.split("?")[0]}});
      document.head.appendChild(script);
    }
    return()=>script?.remove();
  },[title,description,image,product?.name,product?.price,product?.stock]);
  return null;
}
