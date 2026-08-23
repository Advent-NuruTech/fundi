"use client";

import { useState } from "react";
import { User, Phone, Mail, Lock, Loader2, Save, Store, MapPin, CheckCircle2 } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { supabase } from "@/lib/supabase";
import { isSyntheticPortalEmail } from "@/lib/customer-portal";
import { updatePortalContact, updatePortalIdentity } from "@/services/customer-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function PortalProfilePage() {
  const { primaryCustomer, userEmail, userName, userPhone, businesses, refresh } = useCustomerPortal();

  const [fullName, setFullName] = useState(primaryCustomer?.fullName ?? userName);
  const [phone, setPhone] = useState(primaryCustomer?.phone ?? userPhone);
  const [email, setEmail] = useState(isSyntheticPortalEmail(userEmail) ? "" : userEmail);
  const [savingContact, setSavingContact] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const contactDirty =
    fullName !== (primaryCustomer?.fullName ?? userName) ||
    phone !== (primaryCustomer?.phone ?? userPhone) ||
    email.trim() !== (isSyntheticPortalEmail(userEmail) ? "" : userEmail);

  const handleSaveContact = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    const originalEmail = isSyntheticPortalEmail(userEmail) ? "" : userEmail;
    setSavingContact(true);
    const { error } = primaryCustomer
      ? await updatePortalContact({
          customerId: primaryCustomer.id,
          fullName: fullName.trim(),
          ...(phone !== primaryCustomer.phone ? { phone: phone.trim() } : {}),
          ...(email.trim() !== originalEmail ? { email: email.trim() || undefined } : {}),
        })
      : await updatePortalIdentity({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        });
    setSavingContact(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Profile updated");
    await refresh();
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My customer account</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal buying profile—not a business or staff profile.</p>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/60">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">One login across every business</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Orders are connected to this account automatically when a FundiFlow business uses the same phone number or email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div>
            <Label htmlFor="fullName" className="text-xs flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Full name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-xs flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              className="mt-1"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Changing your phone number updates your sign-in id. Use it the next time you log in.
            </p>
          </div>

          <div>
            <Label htmlFor="email" className="text-xs flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Leave blank to keep signing in with your phone number.
            </p>
          </div>

          <Button
            onClick={handleSaveContact}
            disabled={savingContact || !contactDirty}
            className="w-full bg-emerald-700 hover:bg-emerald-800 mt-1"
          >
            {savingContact ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4" /> Connected businesses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5">
          {businesses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">No workshop connected yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Your Global Sell purchases still appear in this portal. Workshop connections appear automatically after a business links your matching contact details.
              </p>
            </div>
          ) : (
            businesses.map((business) => (
              <div key={business.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Store className="h-4 w-4 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{business.name}</p>
                  {business.location && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {business.location}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Connected</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          <div>
            <Label className="text-xs">New password</Label>
            <Input
              type="password"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Confirm new password</Label>
            <Input
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPwd || !newPassword || !confirmPassword}
            className="w-full bg-emerald-700 hover:bg-emerald-800 mt-1"
          >
            {savingPwd ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-slate-400 pb-2">
        Your phone number is also your sign-in id. You can change your password above at any time.
      </p>
    </div>
  );
}
