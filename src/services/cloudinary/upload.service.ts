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
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Missing Cloudinary cloud name.");
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  const data = (await response.json()) as CloudinaryUploadResult;
  const metadata = {
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
  };

  const ref = await addDoc(imagesCollection(input.businessId), metadata);

  return {
    id: ref.id,
    ...metadata,
  };
}

export async function deleteImageMetadata(businessId: string, imageId: string) {
  await deleteDoc(doc(imagesCollection(businessId), imageId));
}
