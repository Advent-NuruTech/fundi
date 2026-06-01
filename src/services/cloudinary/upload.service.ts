import { addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { imagesCollection } from "@/services/collections";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format?: string;
}

export async function uploadImage(input: {
  file: File;
  businessId: string;
  uploadedByUid: string;
  orderId?: string;
  customerId?: string;
}) {
  if (!input.file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }
  if (input.file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be 10MB or smaller.");
  }
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing Cloudinary upload preset.");
  }

  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Missing Cloudinary cloud name.");
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Image upload failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as CloudinaryUploadResult;
  const metadata = cleanUploadMetadata({
    businessId: input.businessId,
    orderId: input.orderId,
    customerId: input.customerId,
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    uploadedByUid: input.uploadedByUid,
    uploadedAt: serverTimestamp(),
  });

  const ref = await addDoc(imagesCollection(input.businessId), metadata);

  return {
    id: ref.id,
    ...metadata,
  };
}

function cleanUploadMetadata<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

export async function deleteImageFromCloudinary(publicId: string) {
  const response = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to delete image from Cloudinary");
  }
}

export async function deleteImageMetadata(businessId: string, imageId: string) {
  await deleteDoc(doc(imagesCollection(businessId), imageId));
}
