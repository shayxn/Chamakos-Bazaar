const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
export async function uploadMedia(file: File): Promise<string> {
  const s = await fetch(`${BASE}/api/uploads/sign`, { method: "POST", credentials: "include" });
  if (s.ok) {
    const sig = await s.json() as { apiKey: string; folder: string; signature: string; timestamp: string; uploadUrl: string };
    const form = new FormData();
    form.append("file", file); form.append("api_key", sig.apiKey); form.append("timestamp", sig.timestamp);
    form.append("folder", sig.folder); form.append("signature", sig.signature);
    const up = await fetch(sig.uploadUrl, { method: "POST", body: form });
    if (!up.ok) throw new Error("Upload failed");
    const d = await up.json() as { secure_url?: string };
    if (!d.secure_url) throw new Error("Upload returned no URL");
    return d.secure_url;
  }
  if (s.status !== 404) throw new Error("Upload signing failed");
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch(`${BASE}/api/uploads`, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok){
    const details=await res.json().catch(()=>null) as {error?:string}|null;
    throw new Error(details?.error||"Upload failed. Please try again.");
  }
  return ((await res.json()) as { url: string }).url;
}
