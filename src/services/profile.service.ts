import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { updatePassword, type User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { membersCollection, usersCollection } from "@/services/collections";

export async function updateProfileInfo(input: {
  uid: string;
  businessId: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
}) {
  const updateData: Record<string, string | null> = {};

  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.photoURL !== undefined) updateData.photoURL = input.photoURL;

  await updateDoc(doc(usersCollection(), input.uid), updateData);
  await updateDoc(doc(membersCollection(input.businessId), input.uid), updateData);
}

export async function changeUserPassword(user: User, newPassword: string) {
  await updatePassword(user, newPassword);
}

export async function uploadProfileAvatar(
  file: File,
  businessId: string,
  uid: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
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
    throw new Error("Avatar upload failed.");
  }

  const data = await response.json();
  const photoURL = data.secure_url;

  await updateProfileInfo({ uid, businessId, photoURL });

  return photoURL;
}
