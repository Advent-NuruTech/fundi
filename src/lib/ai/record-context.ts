// SERVER-ONLY. Bounded, question-specific facts for the business assistant.
// This deliberately never performs broad table exports or accepts raw SQL.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIContextScope } from "./types";

const MAX_ROWS = 8;

function wants(question: string, words: string[]): boolean {
  const text = question.toLowerCase();
  return words.some((word) => text.includes(word));
}

// Words that never name a specific record. Keeping these out of the search term
// means generic questions like "what is out of stock?" or "name the items in my
// inventory" are answered with the real record list instead of a filter that
// matches nothing (e.g. ilike %out%, %name%).
const STOP_WORDS = new Set([
  // interrogatives
  "what", "which", "where", "when", "why", "who", "whom", "whose", "how",
  // prepositions / conjunctions
  "with", "without", "from", "for", "into", "onto", "about", "under", "over",
  "below", "above", "across", "between", "through", "during", "against",
  // pronouns
  "this", "that", "these", "those", "them", "they", "their", "we", "our", "ours",
  "us", "you", "your", "yours", "me", "my", "mine", "it", "its", "he", "she", "his", "her",
  // verbs / auxiliaries
  "have", "has", "had", "are", "were", "was", "is", "am", "be", "been", "being",
  "do", "does", "did", "can", "could", "would", "should", "will", "shall", "may",
  "might", "must", "need", "needs", "want", "wants", "show", "tell", "give", "list",
  "name", "please", "check", "find", "look", "make", "get", "let", "see", "send",
  "follow", "update", "create", "owe", "owed", "owing",
  // domain generics — never specific record names
  "stock", "stocks", "items", "item", "order", "orders", "customer", "customers",
  "branch", "branches", "price", "prices", "quantity", "quantities", "reorder",
  "inventory", "material", "materials", "fabric", "fabrics", "garment", "garments",
  "product", "products", "service", "services", "payment", "payments", "invoice",
  "invoices", "receipt", "receipts", "employee", "employees", "staff", "team",
  "message", "messages", "conversation", "conversations", "announcement", "announcements",
  "business", "company", "outlet", "shop", "location", "locations",
  // time / scope / descriptors
  "current", "currently", "today", "tomorrow", "now", "week", "month", "year",
  "last", "next", "recent", "recently", "many", "much", "all", "any", "none",
  "total", "available", "running", "out", "low", "zero", "empty", "remaining",
  "outstanding", "due", "overdue", "unpaid", "delivered", "pending", "complete",
  "completed", "active", "inactive", "repeat", "loyal", "big", "small",
  // misc filler
  "also", "then", "there", "here", "still", "already", "more", "most", "always",
  "never", "every", "each", "some", "few",
]);

function safeSearchTerm(question: string): string | null {
  const word = question
    .toLowerCase()
    .match(/[a-z0-9-]{3,}/g)
    ?.find((item) => !STOP_WORDS.has(item));
  return word?.slice(0, 48) ?? null;
}

/** Loads only small, relevant record sets to answer a concrete question. */
export async function buildRecordContext(
  admin: SupabaseClient,
  businessId: string,
  question: string,
  scopes: AIContextScope[]
): Promise<string> {
  const allowed = new Set(scopes);
  const blocks: string[] = [];
  const search = safeSearchTerm(question);

  if (allowed.has("inventory") && wants(question, ["stock", "inventory", "material", "fabric", "item", "sku", "reorder", "quantity", "available", "low", "sold"])) {
    const text = question.toLowerCase();
    const outOfStock = /(out of stock|sold out|zero stock|no stock|empty|run out)/.test(text);
    const lowStock = !outOfStock && /(running low|low stock|low on|below reorder|reorder level|need.*reorder|short on)/.test(text);

    let query = admin
      .from("inventory_materials")
      .select("name, sku, category_name, quantity, reorder_level, unit_name, average_unit_cost, selling_price")
      .eq("business_id", businessId);

    if (outOfStock) {
      query = query.lte("quantity", 0).order("name");
    } else if (lowStock) {
      query = query.lte("quantity", "reorder_level").order("reorder_level", { ascending: false });
    } else if (search) {
      query = query.ilike("name", `%${search}%`).order("name");
    } else {
      query = query.order("name");
    }
    query = query.limit(MAX_ROWS);

    const { data } = await query;
    if (data?.length) {
      const label = outOfStock
        ? "Inventory records currently out of stock (quantity 0 or less):"
        : lowStock
          ? "Inventory records at or below their reorder level:"
          : search
            ? `Inventory records matching "${search}":`
            : "Current inventory records (name, quantity, reorder level):";
      blocks.push(`${label} ${data.map((r) => `${r.name} [${r.category_name ?? "Uncategorized"}, SKU ${r.sku ?? "—"}]: ${r.quantity ?? 0} ${r.unit_name ?? "units"}, reorder ${r.reorder_level ?? 0}, cost ${r.average_unit_cost ?? "—"}, selling price ${r.selling_price ?? "—"}`).join("; ")}`);
    } else if (outOfStock || lowStock) {
      blocks.push(
        outOfStock
          ? "- No inventory items are out of stock (every item has quantity above zero)."
          : "- No inventory items are at or below their reorder level right now."
      );
    }
  }

  if (allowed.has("orders") && wants(question, ["order", "delivery", "due", "production", "tailor", "balance", "invoice"])) {
    let query = admin
      .from("orders")
      .select("order_number, customer_name, stage, due_date, subtotal_amount, balance_amount, delivery_status, assigned_tailor_name, order_garments(name, quantity, agreed_price)")
      .eq("business_id", businessId)
      .order("due_date", { ascending: true })
      .limit(MAX_ROWS);
    if (search && /\d/.test(search)) query = query.ilike("order_number", `%${search}%`);
    const { data } = await query;
    if (data?.length) {
      blocks.push(`- Relevant orders: ${data.map((r) => {
        const garments = Array.isArray(r.order_garments)
          ? r.order_garments.map((g: { name?: unknown; quantity?: unknown; agreed_price?: unknown }) => `${g.name ?? "item"} ×${g.quantity ?? 0} @ ${g.agreed_price ?? 0}`).join(", ")
          : "items not available";
        return `${r.order_number}: ${r.customer_name ?? "customer"}, ${r.stage ?? "no stage"}, due ${r.due_date ?? "—"}, total ${r.subtotal_amount ?? 0}, balance ${r.balance_amount ?? 0}, ${r.delivery_status ?? "pending"}${r.assigned_tailor_name ? `, assigned ${r.assigned_tailor_name}` : ""}; items: ${garments}`;
      }).join("; ")}`);
    }
  }

  if (allowed.has("customers") && wants(question, ["customer", "client", "measurement", "repeat", "loyal", "follow up"])) {
    let query = admin
      .from("customers")
      .select("full_name, total_orders, outstanding_balance, last_order_at")
      .eq("business_id", businessId)
      .order("last_order_at", { ascending: false })
      .limit(MAX_ROWS);
    if (search) query = query.ilike("full_name", `%${search}%`);
    const { data } = await query;
    if (data?.length) {
      blocks.push(`- Relevant customer records: ${data.map((r) => `${r.full_name}: ${r.total_orders ?? 0} orders, outstanding balance ${r.outstanding_balance ?? 0}, last order ${r.last_order_at ?? "—"}`).join("; ")}`);
    }
  }

  if (allowed.has("team") && wants(question, ["employee", "staff", "team", "worker", "tailor", "workload"])) {
    const { data } = await admin
      .from("employees")
      .select("name, role, is_active, assigned_orders_count, completed_orders_count")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("assigned_orders_count", { ascending: false })
      .limit(MAX_ROWS);
    if (data?.length) {
      blocks.push(`- Active team: ${data.map((r) => `${r.name} (${r.role}): ${r.assigned_orders_count ?? 0} assigned, ${r.completed_orders_count ?? 0} completed`).join("; ")}`);
    }
  }

  if (allowed.has("branches") && wants(question, ["branch", "outlet", "location", "shop"])) {
    const { data } = await admin
      .from("branches")
      .select("name, location, is_default")
      .eq("business_id", businessId)
      .order("is_default", { ascending: false })
      .limit(MAX_ROWS);
    if (data?.length) {
      blocks.push(`- Branches: ${data.map((r) => `${r.name}${r.is_default ? " (main)" : ""}${r.location ? ` — ${r.location}` : ""}`).join("; ")}`);
    }
  }

  if (allowed.has("messages") && wants(question, ["message", "messages", "chat", "conversation", "announcement"])) {
    const { data } = await admin
      .from("conversations")
      .select("title, type, priority, updated_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(MAX_ROWS);
    if (data?.length) {
      blocks.push(`- Recent internal conversations (metadata only): ${data.map((r) => `${r.title || "Untitled"} (${r.type}, ${r.priority}, updated ${r.updated_at})`).join("; ")}`);
    }
  }

  if (allowed.has("billing") && wants(question, ["billing", "subscription", "plan", "credit", "usage", "invoice"])) {
    const { data } = await admin
      .from("subscriptions")
      .select("plan_slug, status, current_period_end, next_billing_date")
      .eq("workspace_id", businessId)
      .maybeSingle();
    if (data) {
      blocks.push(`- Subscription: ${data.plan_slug ?? "unknown plan"}, status ${data.status ?? "unknown"}, current period ends ${data.current_period_end ?? "—"}, next billing date ${data.next_billing_date ?? "—"}`);
    }
  }

  if (!blocks.length) return "";
  return ["## QUESTION-SPECIFIC BUSINESS RECORDS", "Use these records as facts. They are a bounded result set, not proof that no other matching records exist.", ...blocks].join("\n");
}
