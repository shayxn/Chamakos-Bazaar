import { useQuery } from "@tanstack/react-query";

type NavigationDoc = { id:number;title:string;slug:string;showInNavigation:boolean;data:{url?:string;order?:number;navigationLabel?:string} };
export function useManagedNavigation() {
  const q=useQuery<{href:string;label:string}[]>({
    queryKey:["published-navigation"],
    queryFn:async()=>{
      const base=import.meta.env.BASE_URL.replace(/\/$/,"");
      const get=async(kind:string)=>{const r=await fetch(`${base}/api/published/${kind}`);if(!r.ok)throw new Error("Navigation unavailable");return r.json() as Promise<NavigationDoc[]>;};
      const [pages,navigation]=await Promise.all([get("pages"),get("navigation")]);
      return [...navigation.filter(p=>p.data.url).sort((a,b)=>(a.data.order??0)-(b.data.order??0)).map(p=>({href:p.data.url!,label:p.title})),
        ...pages.filter(p=>p.showInNavigation).map(p=>({href:`/${p.slug}`,label:p.data.navigationLabel||p.title}))];
    },staleTime:30_000,
  });
  return q.data??[];
}
