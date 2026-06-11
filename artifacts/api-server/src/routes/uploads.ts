import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Blob } from "node:buffer";
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

const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image and video files allowed"));
  },
});

const router = Router();

function getMediaType(file: Express.Multer.File): "image" | "video" {
  return file.mimetype.startsWith("video/") ? "video" : "image";
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; type: "image" | "video" }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured");
  }

  if (!file.buffer) {
    throw new Error("Uploaded file buffer is missing");
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "chamakos-bazaar/products";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

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

router.post("/uploads", upload.single("file"), async (req, res) => {
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
