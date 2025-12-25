import { cloudinary } from "./services";

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  _mimeType: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `christmas_cards/${filename}`,
        overwrite: true,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}
