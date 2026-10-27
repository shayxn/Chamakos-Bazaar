import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Blob } from "node:buffer";
import type { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { eq,sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdmin as authenticatedAdmin } from "../lib/auth-middleware";
import { storeMediaSignedUrl } from "../lib/chat-media-storage";
import { rows } from "../lib/management-db";

const mediaExtensions:Record<string,string>={"image/jpeg":".jpg","image/png":".png","image/webp":".webp","image/gif":".gif",
  "video/mp4":".mp4","video/webm":".webm","video/quicktime":".mov"};
let mediaSchema:Promise<void>|undefined;
function ensureMedia(){
  return mediaSchema??=(db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_store_media (
    filename TEXT PRIMARY KEY,content_type TEXT NOT NULL,size BIGINT NOT NULL,uploader_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`).then(()=>undefined).catch(error=>{mediaSchema=undefined;throw error;}));
}

const useCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!useCloudinary && !fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = mediaExtensions[file.mimetype];
    const name = crypto.randomBytes(12).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const cloudinaryStorage = multer.memoryStorage();
const maxUploadSize = useCloudinary ? 15 * 1024 * 1024 : 100 * 1024 * 1024;

const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localStorage,
  limits: { fileSize: maxUploadSize },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image and video files allowed"));
  },
});

const router = Router();

const requireAdmin: RequestHandler = authenticatedAdmin;

export const serveStoredMedia: RequestHandler = async (req,res,next) => {
  if(!/^[a-f0-9]{24}\.(?:jpg|png|webp|gif|mp4|webm|mov)$/.test(String(req.params.filename))){res.sendStatus(404);return;}
  await ensureMedia();
  const asset=rows(await db.execute(sql`SELECT filename FROM imaginate_store_media WHERE filename=${req.params.filename}`))[0];
  if(!asset){res.sendStatus(404);return;}
  try{
    // Serve bytes at the stable product URL. Never cache a redirect containing
    // an expiring storage signature in a product image or video element.
    const headers: Record<string,string> = {};
    if(req.get("range")) headers.Range = req.get("range")!;
    if(req.get("if-none-match")) headers["If-None-Match"] = req.get("if-none-match")!;
    const upstream = await fetch(await storeMediaSignedUrl(asset.filename,"GET"), {
      headers, signal: AbortSignal.timeout(180_000),
    });
    if (upstream.status === 304) {
      res.set("Cache-Control","public,max-age=86400,immutable").status(304).end();
      return;
    }
    if (!upstream.ok) {
      await upstream.body?.cancel();
      res.status(upstream.status === 404 ? 404 : upstream.status === 416 ? 416 : 503).end();
      return;
    }
    for (const key of ["content-type","content-length","content-range","accept-ranges","etag","last-modified"]) {
      const value = upstream.headers.get(key);
      if(value) res.set(key,value);
    }
    res.set("Cache-Control","public,max-age=86400,immutable").status(upstream.status);
    if (req.method === "HEAD") {
      await upstream.body?.cancel();
      res.end();
      return;
    }
    if (!upstream.body) throw new Error("Storage returned no media body.");
    await pipeline(Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream),res);
  }catch(error){
    logger.warn({filename:asset.filename},"Persistent store media unavailable");
    if(res.headersSent){next(error);return;}
    res.set("Cache-Control","no-store").status(503).json({error:"Media is temporarily unavailable."});
  }
};
router.get("/uploads/:filename",serveStoredMedia);

function getMediaType(file: Express.Multer.File): "image" | "video" {
  return file.mimetype.startsWith("video/") ? "video" : "image";
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured");
  }

  return { cloudName, apiKey, apiSecret };
}

function createCloudinarySignature() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "chamakos-bazaar/products";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  return {
    apiKey,
    cloudName,
    folder,
    signature,
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; type: "image" | "video" }> {
  const { cloudName, apiKey } = getCloudinaryConfig();

  if (!file.buffer) {
    throw new Error("Uploaded file buffer is missing");
  }

  const { folder, signature, timestamp } = createCloudinarySignature();

  const formData = new FormData();
  formData.append("file", new Blob([file.buffer as unknown as ArrayBuffer], { type: file.mimetype }), file.originalname);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Cloudinary upload failed: ${message}`);
  }

  const data = (await response.json()) as { secure_url?: string; resource_type?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary upload response did not include a secure_url");
  }

  return {
    url: data.secure_url,
    type: data.resource_type === "video" ? "video" : getMediaType(file),
  };
}

router.post("/uploads/sign", requireAdmin, (_req, res) => {
  if (!useCloudinary) {
    res.status(404).json({ error: "Cloudinary uploads are not configured" });
    return;
  }

  try {
    res.json(createCloudinarySignature());
  } catch (error) {
    logger.error({ err: error }, "Cloudinary signature creation failed");
    res.status(500).json({ error: "Cloudinary signature creation failed" });
  }
});

const acceptUpload:RequestHandler=(req,res,next)=>upload.single("file")(req,res,error=>{
  if(error){res.status(400).json({error:error.code==="LIMIT_FILE_SIZE"?`File exceeds the ${maxUploadSize/(1024*1024)} MB upload limit.`:
    "Upload one JPEG, PNG, WebP, GIF, MP4, WebM or MOV file."});return;}
  next();
});
router.post("/uploads", requireAdmin, acceptUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  if (!useCloudinary) {
    try{
      if(!process.env.PRIVATE_OBJECT_DIR){res.status(503).json({error:"Persistent media storage is not configured."});return;}
      const file=req.file;
      const uploadURL=await storeMediaSignedUrl(file.filename,"PUT");
      const stored=await fetch(uploadURL,{method:"PUT",headers:{"Content-Type":file.mimetype,"Content-Length":String(file.size)},
        body:fs.createReadStream(file.path),duplex:"half",signal:AbortSignal.timeout(180000)} as RequestInit&{duplex:"half"});
      if(!stored.ok)throw new Error("Persistent upload was not accepted.");
      await ensureMedia();
      await db.execute(sql`INSERT INTO imaginate_store_media(filename,content_type,size,uploader_id)
        VALUES(${file.filename},${file.mimetype},${file.size},${Number(req.session?.userId)})`);
      res.json({url:`/api/uploads/${file.filename}`,type:getMediaType(file)});
    }catch(error){
      logger.warn({error:"Persistent upload failed"},"Store media upload unavailable");
      res.status(502).json({error:"Media could not be saved to persistent storage. Please try again."});
    }finally{await fs.promises.unlink(req.file.path).catch(()=>{});}
    return;
  }

  try {
    const media = await uploadToCloudinary(req.file);
    res.json(media);
  } catch (error) {
    logger.error({ err: error }, "Image upload failed");
    res.status(502).json({ error: "Media upload failed" });
  }
});

export default router;
