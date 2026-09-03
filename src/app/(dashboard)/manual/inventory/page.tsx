import {
  Boxes,
  ClipboardCheck,
  ScanLine,
} from "lucide-react";

import {
  Checklist,
  ExampleCard,
  FieldGuide,
  ManualHeader,
  Note,
  NumberedSteps,
  ProductLink,
  SectionHeading,
  type ManualField,
} from "@/modules/manual/components/manual-ui";

const materialFields: ManualField[] = [
  {
    field: "Item type",
    required: true,
    meaning: "Choose what is being stocked: Fabric, Ready-Made, Material, Accessory, Consumable, or Other. This helps your team identify how the item is used and sold.",
    example: "Fabric for Ankara wax-print cloth; Ready-Made for a completed school sweater.",
  },
  {
    field: "Material name",
    required: true,
    meaning: "The clear, specific name staff will search for when recording usage, selling stock, or ordering more.",
    example: "Royal blue kitenge, 100% cotton",
  },
  {
    field: "SKU",
    meaning: "Your internal stock code. FundiFlow suggests one from the name; you can keep it or type a code your shop already uses.",
    example: "KIT-RBL-001",
  },
  {
    field: "Category",
    required: true,
    meaning: "A grouping for filtering the materials list. Choose an existing category or create one from the picker. Manage Categories lets you rename or remove empty categories.",
    example: "Kitenge fabrics",
  },
  {
    field: "Unit",
    required: true,
    meaning: "The unit used for stock, purchase orders, adjustments, and usage. Create a unit from the picker if it does not exist.",
    example: "metres for fabric; pieces for buttons; rolls for lining",
  },
  {
    field: "Supplier",
    meaning: "The usual supplier for this item. Linking one makes reorders easier, but it is optional when first creating a material.",
    example: "Eastleigh Textiles Ltd",
  },
  {
    field: "Quantity",
    required: true,
    meaning: "The amount currently on hand when you first create the record. After setup, use Receive or Adjust for stock changes so the movement history stays accurate.",
    example: "48 metres",
  },
  {
    field: "Reorder level",
    required: true,
    meaning: "The minimum safe quantity. An item at or below this value appears in Low Stock and may receive a smart reorder suggestion.",
    example: "15 metres",
  },
  {
    field: "Cost price per item (KES)",
    required: true,
    meaning: "What one unit costs the business. FundiFlow uses it to estimate stock value and suggested reorder cost.",
    example: "KES 650 per metre",
  },
  {
    field: "Sales pricing",
    meaning: "Selling price, wholesale price, and minimum selling price are optional prices for saleable stock. They are not the cost price.",
    example: "Selling KES 950; wholesale KES 850; minimum KES 800 per metre",
  },
  {
    field: "Images and attributes",
    meaning: "Add photos plus colour, size, and brand to make the right item easy to choose. The first image is the cover in the materials list.",
    example: "Blue floral fabric photo; colour: royal blue; brand: Da Gama",
  },
  {
    field: "Fabric details and custom fields",
    meaning: "For Fabric, you can record GSM, roll length, pattern, composition, and any business-specific label/value pair. These are optional reference details.",
    example: "150 GSM; 6 m roll; floral; 100% cotton; width: 45 inches",
  },
];

const supplierFields: ManualField[] = [
  {
    field: "Supplier name",
    required: true,
    meaning: "The supplier business or person your team will select on a purchase order.",
    example: "Eastleigh Textiles Ltd",
  },
  {
    field: "Phone",
    required: true,
    meaning: "The supplier contact number. Use a complete reachable number so the record is useful when reordering.",
    example: "+254 722 123 456",
  },
  {
    field: "Contact person",
    meaning: "The person to call or message at the supplier.",
    example: "Mary Wambui",
  },
  {
    field: "Notes",
    meaning: "Useful buying information such as location, delivery terms, preferred payment method, or which items they supply.",
    example: "Shop B12, Jamia Mall; delivers orders above KES 20,000.",
  },
];

const purchaseOrderFields: ManualField[] = [
  {
    field: "Supplier",
    required: true,
    meaning: "Choose the supplier sending this order. You can add a name inline, but open Suppliers later to complete its phone and contact details.",
    example: "Eastleigh Textiles Ltd",
  },
  {
    field: "Material",
    required: true,
    meaning: "Choose the existing stock record being purchased. The list shows its current quantity and unit. Inline Add New creates a basic material record for the order.",
    example: "Royal blue kitenge (48 metres)",
  },
  {
    field: "Purchase quantity",
    required: true,
    meaning: "The total quantity you ordered, which must be above zero. When editing a partially received order, it cannot be less than the quantity already received.",
    example: "60",
  },
  {
    field: "Unit",
    required: true,
    meaning: "The purchased unit. It normally follows the material's unit; choose or create the correct unit before saving.",
    example: "metres",
  },
  {
    field: "Price per unit",
    required: true,
    meaning: "The agreed supplier cost for one unit on this purchase order. The form also shows the estimated total as quantity multiplied by unit cost.",
    example: "KES 620",
  },
  {
    field: "Expected date",
    required: true,
    meaning: "The expected arrival date. It helps the workshop see which materials should be coming in.",
    example: "18 September 2026",
  },
];

export default function InventoryManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual · Inventory"
        title="Keep fabric, stock, and supplies under control"
        description="Inventory is the single record of what your tailoring business has, what is running low, what has been ordered, and what moved in or out. Use it before selling ready-made items or recording material usage on an order."
        actionHref="/inventory"
        actionLabel="Open Inventory"
      />

      <Note>
        <strong>Best practice:</strong> create the material once, then let FundiFlow record later changes through purchase-order receiving, order usage or sales, and stock adjustments. Editing the opening Quantity is for correcting the item record; an adjustment preserves a reason and an audit trail.
      </Note>

      <section className="space-y-4">
        <SectionHeading
          number={1}
          title="Know the Inventory tabs"
          description="Open Inventory from the main navigation. The tabs work together, so a change made in one appears in the others."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ExampleCard title="Overview">
            <p>Total materials, stock value (for authorised users), suppliers, low-stock alerts, pending purchase orders, and material consumption at a glance.</p>
          </ExampleCard>
          <ExampleCard title="Stock control" tone="blue">
            <p><strong>Materials</strong> holds each item. <strong>Low Stock</strong> highlights items at or below their reorder level. <strong>Smart Reorder</strong> also uses the past 30 days of outflow.</p>
          </ExampleCard>
          <ExampleCard title="Buying" tone="amber">
            <p><strong>Suppliers</strong> stores contacts. <strong>Purchase Orders</strong> records what you ordered, then Receive adds deliveries to stock.</p>
          </ExampleCard>
          <ExampleCard title="Audit and usage">
            <p><strong>Stock Movements</strong> is the history of every in/out change. <strong>Material Consumption</strong> summarises material used in orders.</p>
          </ExampleCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={2}
          title="Set up materials and ready-made stock"
          description="Use Materials for fabric, accessories, consumables, ready-made garments, and any other item whose quantity matters."
        />
        <NumberedSteps
          steps={[
            { title: "Open Materials and select Add Material", text: "Choose the item type first, then enter a clear name. FundiFlow suggests an SKU once there is a name; use the sparkle button if you want to regenerate it." },
            { title: "Choose the category and unit", text: "Both are required. Use Select or create category and Select or create unit if this is your first item of that kind. Categories that still contain materials cannot be deleted." },
            { title: "Enter the opening stock and protection level", text: "Quantity is what is physically available now. Reorder level is the amount at which you want FundiFlow to flag the item. Use the same unit for both." },
            { title: "Add cost, selling details, and identifiers", text: "Cost price drives stock-value and reorder-cost estimates. Add selling, wholesale, and minimum prices only when the item is sold directly. Photos and attributes help staff choose the exact stock item." },
            { title: "Save, then verify the list", text: "Use category buttons and search to find the saved item. Select its name to open the material detail page, where you can review stock, supplier, price, images, fabric details, and use Reorder." },
          ]}
        />
        <FieldGuide fields={materialFields} />
        <ExampleCard title="Kenyan tailoring example">
          <p>For a dressmaker in Nairobi, create <strong>Royal blue kitenge, 100% cotton</strong> as Fabric, category <strong>Kitenge fabrics</strong>, unit <strong>metres</strong>, quantity <strong>48</strong>, reorder level <strong>15</strong>, and cost <strong>KES 650</strong> per metre. When the balance reaches 15 m or lower, it will appear in Low Stock.</p>
        </ExampleCard>
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={3}
          title="Count stock correctly and record adjustments"
          description="Adjustments are for a physical count correction, damage, spoilage, returned stock, or another exceptional difference."
        />
        <NumberedSteps
          steps={[
            { title: "Find the item", text: "In Materials, filter by category or search by material name, category, or unit." },
            { title: "Select Adjust", text: "The panel shows the current quantity and its unit. Enter the difference, not the final quantity." },
            { title: "Use a signed quantity", text: "Enter a positive number to add stock and a negative number to remove stock. The plus and minus controls can help set the change." },
            { title: "Give a useful reason and Record", text: "A non-zero adjustment and a reason are required. FundiFlow updates the quantity and creates a Stock Movements entry with the staff member and date." },
          ]}
        />
        <ExampleCard title="Stock-count example" tone="amber">
          <p>The system shows 48 metres of kitenge, but the Friday count finds 45 metres after 3 metres were damaged by a leak. Select <strong>Adjust</strong>, enter <strong>-3</strong>, and record <strong>Water-damaged fabric found during stock count</strong>. Do not type 45 as the adjustment; that would remove 45 metres.</p>
        </ExampleCard>
        <Note warning>
          Deleting a material is permanent after you confirm it. Prefer updating a name, category, or price when you only need to correct its details.
        </Note>
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={4}
          title="Maintain supplier contacts"
          description="A completed supplier record makes purchasing faster and gives staff the right person to call when a delivery is late."
        />
        <NumberedSteps
          steps={[
            { title: "Open the Suppliers tab and select Add Supplier", text: "Enter the supplier name and telephone number, then add the contact person and notes where useful." },
            { title: "Save and link the supplier", text: "Select the supplier when adding or editing a material, and again when creating a purchase order." },
            { title: "Keep the contact current", text: "Use Edit to revise a number, contact person, or buying notes. Use search to find an existing supplier by name, phone, contact person, or notes." },
          ]}
        />
        <FieldGuide fields={supplierFields} />
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={5}
          title="Create purchase orders and receive deliveries"
          description="A purchase order records what you intend to buy. It does not increase stock until you receive the actual delivery."
        />
        <NumberedSteps
          steps={[
            { title: "Select New Purchase", text: "Search existing orders first if you are following up on one. Select a supplier and material, or use Add New for a basic record that you can complete later." },
            { title: "Enter the full order", text: "Add the total ordered quantity, unit, unit cost, and expected date. Save with Create Purchase Order. New orders start as Pending." },
            { title: "Receive what really arrived", text: "For a Pending or Partial order, use Receive and enter the delivered amount. You may receive part of an order; the remaining amount stays outstanding." },
            { title: "Check the status and stock", text: "Receiving adds that quantity to the material immediately and creates a movement. The order becomes Partial until the full quantity is received, then Received." },
          ]}
        />
        <FieldGuide fields={purchaseOrderFields} />
        <ExampleCard title="Partial-delivery example" tone="blue">
          <p>Order 60 metres of royal blue kitenge at KES 620 per metre. If the supplier delivers 35 metres today, receive <strong>35</strong>. Stock rises by 35, the PO becomes <strong>Partial</strong>, and the remaining 25 metres can be received later. You cannot receive more than the amount still waiting.</p>
        </ExampleCard>
        <Note warning>
          Do not mark stock as received just because you placed the order or paid a deposit. Receive only the quantity physically delivered and checked.
        </Note>
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={6}
          title="Act on low-stock and smart-reorder alerts"
          description="Low Stock protects the minimum you set; Smart Reorder adds recent demand so you can see items likely to run out before the next delivery."
        />
        <Checklist
          items={[
            "Low Stock lists an item when its current quantity is at or below its reorder level. Out Of Stock means its quantity is zero or less.",
            "Use Create PO on a Low Stock card to start a prefilled purchase order, or View to inspect the material details first.",
            "Smart Reorder considers negative stock movements from the last 30 days, including sales, material use, and downward adjustments.",
            "Its suggested quantity targets the higher of your reorder level or about 14 days of recent usage (7-day lead time plus 7-day safety buffer).",
            "Days of cover and fast-mover labels are estimates from recorded movements. They improve only when stock changes and usage are recorded accurately.",
            "Review the estimated restock cost before ordering; it uses the material's saved cost price, not a live supplier quotation.",
          ]}
        />
        <ExampleCard title="How to read the recommendation">
          <p>If a lining fabric has 4 metres left, a reorder level of 10 m, and regular recent use, Smart Reorder may call it <strong>Runs out soon</strong> and propose enough metres to cover expected usage. Use <strong>Order now</strong> to open a prefilled purchase-order form, then confirm the supplier's current price and delivery date before saving.</p>
        </ExampleCard>
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={7}
          title="Audit movements and understand material consumption"
          description="These reports explain why a quantity changed and help you investigate a difference between the shelf and the system."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><ScanLine className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Stock Movements</h3></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Filter the report by material, reason, staff member, movement type, or date range. Each row shows the material, type, signed change, reason, staff member, and date. A plus sign adds stock; a minus sign removes it. Use Clear filters to return to the full history.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><ClipboardCheck className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Material Consumption</h3></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">This report focuses on material marked Used in Order. Filter by material or order and date range, then compare the total usage, materials tracked, bar chart, and usage records. It is a production-usage report, not a replacement for physical counts.</p>
          </div>
        </div>
        <ExampleCard title="Weekly control routine" tone="emerald">
          <p>Every Friday, a workshop manager can review Low Stock and Smart Reorder, count the urgent fabrics, receive any deliveries, use Stock Movements to explain differences, and check Material Consumption for unusually high use on orders. This keeps Monday's production queue from being blocked by missing fabric or accessories.</p>
        </ExampleCard>
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Boxes className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-lg font-bold text-emerald-950">Inventory workflow at a glance</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">Set up suppliers and materials, create the purchase order, receive the physical delivery, then record all exceptional changes as adjustments. As ready-made items sell and materials are used in orders, review the movement and consumption reports before your next order.</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <ProductLink href="/inventory">Open Inventory</ProductLink>
              <ProductLink href="/inventory?section=materials">Open Materials</ProductLink>
              <ProductLink href="/inventory?section=purchase-orders">Open Purchase Orders</ProductLink>
              <ProductLink href="/inventory?section=low-stock">Open Low Stock</ProductLink>
              <ProductLink href="/inventory?section=stock-movements">Open Stock Movements</ProductLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
