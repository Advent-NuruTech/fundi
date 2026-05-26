import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  getAuth,
  type User,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";
import { auth } from "@/lib/firebase";
import {
  bootstrapBusiness,
  completeFirstPasswordChange,
  createInvitationRecord,
  fetchUserProfile,
  upsertInvitedMember,
} from "@/services/firestore.service";
import type { UserRole } from "@/types/domain";

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  await signOut(auth);
}

export async function registerOwner(input: {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  businessName: string;
  location: string;
}) {
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  await updateProfile(credential.user, { displayName: input.displayName });
  await bootstrapBusiness({
    uid: credential.user.uid,
    email: input.email,
    displayName: input.displayName,
    phone: input.phone,
    businessName: input.businessName,
    location: input.location,
  });
}

export async function resolveProfile(user: User) {
  return fetchUserProfile(user.uid);
}

export function authStateListener(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

function buildTempPassword() {
  return `Fundi#${Math.random().toString(36).slice(2, 10)}1!`;
}

function buildInviteToken() {
  return crypto.randomUUID();
}

function firebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export async function inviteEmployeeToWorkshop(input: {
  businessId: string;
  inviterUid: string;
  inviterName: string;
  email: string;
  displayName: string;
  roles: UserRole[];
}) {
  const tempPassword = buildTempPassword();
  const token = buildInviteToken();
  const secondaryApp = initializeApp(firebaseClientConfig(), `invite-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const invitedCredential = await createUserWithEmailAndPassword(secondaryAuth, input.email, tempPassword);
    await upsertInvitedMember({
      businessId: input.businessId,
      uid: invitedCredential.user.uid,
      email: input.email,
      displayName: input.displayName,
      roles: input.roles,
      invitedByUid: input.inviterUid,
      invitedByName: input.inviterName,
    });

    await createInvitationRecord(input.businessId, {
      businessId: input.businessId,
      email: input.email,
      displayName: input.displayName,
      roles: input.roles,
      token,
      temporaryPassword: tempPassword,
      invitedByUid: input.inviterUid,
      invitedByName: input.inviterName,
    });

    const invitationLink = `${window.location.origin}/login?invite=${token}&workspace=${input.businessId}`;
    return { invitationLink, temporaryPassword: tempPassword };
  } catch (error) {
    throw error;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function forcePasswordResetForFirstLogin(user: User, newPassword: string) {
  await updatePassword(user, newPassword);
  await completeFirstPasswordChange(user.uid);
}
