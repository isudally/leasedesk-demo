import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import type { Request } from "express";
import { getRuntimeConfig } from "./config";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const EXTENSIONS_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    const uploadRoot = getDocumentUploadRoot();
    fs.mkdirSync(uploadRoot, { recursive: true });
    callback(null, uploadRoot);
  },
  filename: (_req, file, callback) => {
    const extension = EXTENSIONS_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

export const uploadTenantDocument = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req: Request, file, callback) => {
    if (!ALLOWED_DOCUMENT_TYPES.has(file.mimetype)) {
      return callback(new Error("Unsupported document type. Upload PDF, JPG or PNG files only."));
    }
    callback(null, true);
  },
}).single("file");

export function getDocumentUploadRoot(env: NodeJS.ProcessEnv = process.env) {
  const config = getRuntimeConfig(env);
  if (config.isProductionMode && !config.uploadDir) {
    throw new Error("LEASEDESK_UPLOAD_DIR is required for production document storage.");
  }
  return path.resolve(process.cwd(), config.uploadDir ?? "data/uploads");
}

export function documentPathFromStorageKey(storageKey: string) {
  const uploadRoot = getDocumentUploadRoot();
  const resolved = path.resolve(uploadRoot, storageKey);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Invalid document reference.");
  }
  return resolved;
}

export async function validateDocumentSignature(filePath: string, claimedMimeType: string) {
  const handle = await fsp.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead);

    if (claimedMimeType === "application/pdf") {
      return header.subarray(0, 4).toString("ascii") === "%PDF";
    }

    if (claimedMimeType === "image/jpeg") {
      return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }

    if (claimedMimeType === "image/png") {
      return header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    return false;
  } finally {
    await handle.close();
  }
}

export function safeDocumentSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
