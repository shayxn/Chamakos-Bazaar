const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export const fetchApi = async (url: string, options?: RequestInit) => {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });
  if (!res.ok) {
    let err = res.statusText;
    try {
      const data = await res.json();
      if (data.error) err = data.error;
    } catch {}
    throw new Error(err);
  }
  return res.json();
};
