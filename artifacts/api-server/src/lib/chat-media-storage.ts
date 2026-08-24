import { randomUUID } from "crypto";

const SIDECAR_URL = "http://127.0.0.1:1106/object-storage/signed-object-url";
const CHAT_MEDIA_PREFIX = "admin-chat";

function privateLocation() {
  const raw = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!raw) throw new Error("Private object storage is not configured.");
  const [bucketName, ...pathParts] = raw.split("/");
  if (!bucketName) throw new Error("Private object storage is not configured.");
  return { bucketName, basePath: pathParts.join("/") };
}

function isChatMediaPath(value: string) {
  return /^admin-chat\/[0-9a-f-]{36}$/i.test(value);
}

async function signedUrl(objectPath: string, method: "GET" | "PUT" | "HEAD") {
  if (!isChatMediaPath(objectPath)) throw new Error("Invalid chat media path.");
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

export async function createChatMediaUpload() {
  const objectPath = `${CHAT_MEDIA_PREFIX}/${randomUUID()}`;
  return { objectPath, uploadURL: await signedUrl(objectPath, "PUT") };
}

export async function createChatMediaDownload(objectPath: string) {
  return signedUrl(objectPath, "GET");
}

export async function inspectChatMedia(objectPath: string) {
  const response = await fetch(await signedUrl(objectPath, "HEAD"), {
    method: "HEAD",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Uploaded chat media was not found.");
  const size = Number(response.headers.get("content-length") ?? 0);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  return { size, contentType };
}

export function isValidChatMediaPath(value: unknown): value is string {
  return typeof value === "string" && isChatMediaPath(value);
}