import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const severity = url.searchParams.get("severity") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const offset = (page - 1) * limit;

  let query = db
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (severity) query = query.eq("severity", severity);
  if (action) query = query.ilike("action", `%${action}%`);
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, limit });
}
