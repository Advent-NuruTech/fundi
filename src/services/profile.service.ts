import { supabase } from "@/lib/supabase";
import { transformKeysToSnake } from "@/lib/case-utils";

export async function updateProfileInfo(input: {
  uid: string;
  businessId: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
}) {
  const updateData: Record<string, unknown> = {};

  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.photoURL !== undefined) updateData.photoURL = input.photoURL;

  const snakeData = transformKeysToSnake(updateData, false);
  await supabase.from("profiles").update(snakeData).eq("id", input.uid);
  await supabase.from("business_members").update(snakeData).eq("profile_id", input.uid).eq("business_id", input.businessId);
}

export async function changeUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
}

export async function uploadProfileAvatar(
  file: File,
  businessId: string,
  uid: string
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be 10MB or smaller.");
  }
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing Cloudinary upload preset.");
  }

  const formData = new FormData();
  formData.append("file", file);
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
    throw new Error(`Avatar upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const photoURL = data.secure_url;

  await updateProfileInfo({ uid, businessId, photoURL });

  return photoURL;
}
