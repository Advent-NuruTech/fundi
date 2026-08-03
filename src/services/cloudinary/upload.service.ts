import { supabase } from "@/lib/supabase";
import { transformKeysToSnake, transformKeysToCamel } from "@/lib/case-utils";
import type { ImageMeta } from "@/types/domain";

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

  // ── Pre-flight: make sure the workspace has room for this file ─────────────
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    try {
      const checkRes = await fetch(
        `/api/billing/usage/check?resource=storage&units=${input.file.size}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (checkRes.ok) {
        const check = await checkRes.json();
        if (!check.ok) {
          throw new Error(
            "Your storage is full. Free up space or add more storage in Settings → Usage & Top-ups."
          );
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Your storage is full")) {
        throw err;
      }
      console.warn("Storage pre-flight check skipped:", err);
    }
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
    sizeBytes: input.file.size,
    uploadedByUid: input.uploadedByUid,
    uploadedAt: new Date().toISOString(),
  });

  try {
    const { data: inserted, error } = await supabase
      .from("images")
      .insert(transformKeysToSnake(metadata as Record<string, unknown>))
      .select()
      .single();

    if (error || !inserted) throw error || new Error("Failed to save image metadata");

    return transformKeysToCamel<ImageMeta>(inserted as Record<string, unknown>);
  } catch {
    // DB metadata save failed but Cloudinary upload succeeded — return URL directly
    return {
      id: "",
      businessId: input.businessId,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format ?? "",
      sizeBytes: input.file.size,
      uploadedByUid: input.uploadedByUid,
      uploadedAt: new Date().toISOString(),
    } as ImageMeta;
  }
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
  const { error } = await supabase.from("images").delete().eq("id", imageId).eq("business_id", businessId);
  if (error) throw error;
}
