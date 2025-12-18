import type { Database } from "@/database.types";
import { env } from "@/env";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_SECRET,
});

export { cloudinary };

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_DEFAULT_KEY,
);

export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});
