const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, { credentials: "include", headers: init?.body ? { "Content-Type": "application/json" } : undefined, ...init });
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try { const j = await r.json(); if (j?.error || j?.message) msg = j.error || j.message; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}
