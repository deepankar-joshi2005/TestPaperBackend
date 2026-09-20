import { v2 as cloudinary } from "cloudinary";

// Deliberately NOT read into a top-level const — same reasoning as
// config/razorpay.ts: tsx/esbuild's CJS output can hoist imports above
// dotenv.config(), so process.env must be read lazily, at call time.
let configured = false;
let warned = false;

function ensureConfigured(): void {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || "";
  const api_key = process.env.CLOUDINARY_API_KEY || "";
  const api_secret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloud_name || !api_key || !api_secret) {
    if (!warned) {
      console.warn(
        "[cloudinary] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set — uploads will fail until Backend/.env is filled in."
      );
      warned = true;
    }
    throw new Error(
      "Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Backend/.env"
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; public_id?: string } = {}
): Promise<{ secure_url: string; public_id: string }> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder: "test-paper-app", ...options },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}
