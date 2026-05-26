"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-context";
import { registerSchema, type RegisterValues } from "@/schemas/auth.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const { registerOwner } = useAuth();
  const { register, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      await registerOwner(values);
      toast.success("Workshop created. Welcome to FundiFlow.");
      router.push("/dashboard");
    } catch {
      toast.error("Registration failed. Try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create your tailoring workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="displayName">Owner name</Label>
              <Input id="displayName" {...register("displayName")} />
            </div>
            <div>
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" {...register("businessName")} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
            </div>
            <div className="md:col-span-2">
              <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Creating workspace..." : "Create workspace"}
              </Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account? <Link href="/login" className="font-medium text-emerald-700">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
