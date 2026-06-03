"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Lock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Password reset disabled</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">Workspace-managed credentials</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Password reset emails are disabled. Ask your workspace admin for updated credentials, or change your
            password from your profile when you are signed in.
          </p>
          <Link href="/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
