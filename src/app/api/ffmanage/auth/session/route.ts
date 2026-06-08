import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, uid: admin.uid, email: admin.email });
}
