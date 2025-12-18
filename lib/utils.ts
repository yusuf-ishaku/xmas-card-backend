import { cloudinary } from "./services";

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string,
) {
  // Cloudinary supports uploading from base64 or streams. We'll use base64 for simplicity.
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: `christmas_cards/${filename}`,
    overwrite: true,
  });
  return result.secure_url;
}
