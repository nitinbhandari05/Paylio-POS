import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";

export const fileService = {
  async uploadImage(file, folder = "smart-pos/products") {
    if (!file) return null;
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, uploaded) =>
        error ? reject(error) : resolve(uploaded)
      );
      Readable.from(file.buffer).pipe(stream);
    });
    return { url: result.secure_url, publicId: result.public_id };
  },
};
