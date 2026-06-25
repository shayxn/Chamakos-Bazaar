import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Blob } from "node:buffer";
import type { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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
    const ext = path.extname(file.originalname);
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
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image and video files allowed"));
  },
});

const router = Router();

const requireAdmin: RequestHandler = async (req, res, next) => {
  const session = req.session as Record<string, unknown>;
  const userId = session?.userId as number | undefined;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};

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
  formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
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

router.post("/uploads", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  if (!useCloudinary) {
    res.json({ url: `/uploads/${req.file.filename}`, type: getMediaType(req.file) });
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
