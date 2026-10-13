const SIDECAR_URL = "http://127.0.0.1:1106/object-storage/signed-object-url";

function privateLocation() {
  const raw = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!raw) throw new Error("Private object storage is not configured.");
  const [bucketName, ...pathParts] = raw.split("/");
  if (!bucketName) throw new Error("Private object storage is not configured.");
  return { bucketName, basePath: pathParts.join("/") };
}

async function signObject(objectPath: string, method: "GET" | "PUT" | "HEAD" | "DELETE") {
  const { bucketName, basePath } = privateLocation();
  const objectName = [basePath, objectPath].filter(Boolean).join("/");
  const response = await fetch(SIDECAR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Could not create a secure media URL.");
  const data = await response.json() as { signed_url?: string };
  if (!data.signed_url) throw new Error("Storage did not return a media URL.");
  return data.signed_url;
}

/** Store assets use a tightly validated namespace in private object storage. */
export function storeMediaSignedUrl(filename:string,method:"GET"|"PUT"|"DELETE"){
  if(!/^[a-f0-9]{24}\.(?:jpg|png|webp|gif|mp4|webm|mov)$/.test(filename))throw new Error("Invalid store media filename.");
  return signObject(`store-media/${filename}`,method);
}

/** One-off, path-scoped cleanup for legacy chat uploads; never exposed as an API route. */
export async function deleteLegacyChatMedia(objectPath: string): Promise<boolean> {
  if (!/^admin-chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objectPath)) {
    throw new Error("Refusing to delete an object outside the legacy chat-media namespace.");
  }
  const response = await fetch(await signObject(objectPath, "DELETE"), {
    method: "DELETE",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Could not delete a legacy chat-media object.");
  return true;
}