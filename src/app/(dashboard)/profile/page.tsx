"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { User, Mail, Shield, Building2, Lock, Loader2, Save, Store, Phone, MapPin, Eye, Users } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { updateProfileInfo, changeUserPassword } from "@/services/profile.service";
import { updateBusinessProfile, listenOrdersAssignedToUser } from "@/services/firestore.service";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import type { Order } from "@/types/domain";

export default function ProfilePage() {
  const { user, business, refreshProfile, isOwner } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
    }
    if (business) {
      setBusinessName(business.name || "");
      setBusinessPhone(business.phone || "");
      setBusinessLocation(business.location || "");
    }
  }, [user, business]);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsub = listenOrdersAssignedToUser(user.businessId, user.uid, setAssignedOrders);
    return unsub;
  }, [user?.businessId, user?.uid]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.businessId || !user?.uid) return;
    setSaving(true);
    try {
      await updateProfileInfo({ uid: user.uid, businessId: user.businessId, displayName, bio });
      await refreshProfile();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [user, displayName, bio, refreshProfile]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const { auth } = await import("@/lib/firebase");
      if (!auth.currentUser) { toast.error("Session expired"); return; }
      await changeUserPassword(auth.currentUser, newPassword);
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  const handleSaveBusiness = useCallback(async () => {
    if (!user?.businessId) return;
    setSavingBusiness(true);
    try {
      await updateBusinessProfile(user.businessId, {
        name: businessName,
        phone: businessPhone,
        location: businessLocation,
      });
      await refreshProfile();
      toast.success("Business settings updated");
    } catch {
      toast.error("Failed to update business");
    } finally {
      setSavingBusiness(false);
    }
  }, [user?.businessId, businessName, businessPhone, businessLocation, refreshProfile]);

  const handleAvatarUpload = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  const activeOrders = assignedOrders.filter((o) => o.stage !== "delivered").length;
  const completedOrders = assignedOrders.filter((o) => o.stage === "delivered").length;

  if (!user) return null;

  const profileTab = (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <AvatarUpload
              currentPhotoURL={user.photoURL}
              displayName={user.displayName}
              businessId={user.businessId}
              uid={user.uid}
              onUploadComplete={handleAvatarUpload}
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900">{user.displayName}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  {(user.roles?.length ? user.roles : [user.role]).map((r) => r.replace("_", " ")).join(", ")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {business?.name || "Workspace"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{activeOrders}</p><p className="text-xs text-slate-500">Active Orders</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{completedOrders}</p><p className="text-xs text-slate-500">Completed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{assignedOrders.length}</p><p className="text-xs text-slate-500">Total Assigned</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-500" /><CardTitle>Profile Information</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const accountTab = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /><CardTitle>Account Details</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Email address</Label>
              <Input value={user.email} disabled className="bg-slate-50" />
              <p className="mt-1 text-xs text-slate-400">Email cannot be changed at this time.</p>
            </div>
            <div>
              <Label>Member since</Label>
              <Input value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "N/A"} disabled className="bg-slate-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-slate-500" /><CardTitle>Change Password</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword} className="gap-2">
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                <Lock className="h-4 w-4" /> Update password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-500" /><CardTitle>Business Membership</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{business?.name || "Workspace"}</p>
                <p className="text-xs text-slate-500">Business ID: {user.businessId}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                Role: {(user.roles?.length ? user.roles : [user.role]).map((r) => r.replace("_", " ")).join(", ")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const businessTab = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Store className="h-4 w-4 text-slate-500" /><CardTitle>Business Settings</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName" className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-slate-400" /> Business name</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="businessPhone" className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> Phone number</Label>
              <Input id="businessPhone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="businessLocation" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> Location</Label>
              <Input id="businessLocation" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveBusiness} disabled={savingBusiness} className="gap-2">
                {savingBusiness && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" /> Save business settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /><CardTitle>Invitation Link</CardTitle></div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-slate-500">
            Share this link with employees to let them join your workshop:
          </p>
          <div className="flex items-center gap-2">
            <Input value={`${typeof window !== "undefined" ? window.location.origin : ""}/login?workspace=${user.businessId}`} readOnly className="bg-slate-50 text-xs" />
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/login?workspace=${user.businessId}`);
              toast.success("Link copied");
            }}>Copy</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /><CardTitle>Team Overview</CardTitle></div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mt-1">Business management is available under the Employees section.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/employees"}>
            Manage team
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const tabs = [
    { id: "profile", label: "Profile", content: profileTab },
    { id: "account", label: "Account", content: accountTab },
  ];

  if (isOwner) {
    tabs.splice(1, 0, { id: "business", label: "Business", content: businessTab });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Manage your account, profile, and business settings</p>
      </div>
      <Tabs tabs={tabs} defaultTab="profile" />
    </div>
  );
}
