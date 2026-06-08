import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { mapDbToSubscription } from "@/lib/billing/subscription-service";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Resolve workspace via profile
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ subscription: null }, { status: 200 });
    }

    const { data, error } = await admin
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", profile.business_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      subscription: data ? mapDbToSubscription(data) : null,
    });
  } catch (err) {
    console.error("[billing/subscription]", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
