import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Layers,
  PackageCheck,
  Scissors,
  Shirt,
  Users,
  Wrench,
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

const orderFields: ManualField[] = [
  {
    field: "Customer",
    required: true,
    meaning: "The individual or group that owns this order. Search by name or phone and use the Customers / Groups filters. Create the customer first if they are missing.",
    example: "Amina Wanjiku",
  },
  {
    field: "Assigned tailor",
    meaning: "The default staff member responsible for the order. You may leave the order unassigned or choose a different tailor on each tailored or alteration item.",
    example: "Esther Njeri",
  },
  {
    field: "Due date",
    required: true,
    meaning: "The date the workshop promises the order will be ready. The Orders page date filters use this due date, not the date the order was entered.",
    example: "12 September 2026",
  },
  {
    field: "Initial payment (KES)",
    meaning: "Money received when creating the order. It becomes the first payment and reduces Balance due. It cannot be more than the full order total.",
    example: "2,000",
  },
  {
    field: "Design / style notes",
    meaning: "Instructions that apply to the whole order. Put instructions for only one garment in that item's Notes / style details instead.",
    example: "All items should use gold buttons and matching lining.",
  },
  {
    field: "Order reference image",
    meaning: "One overall inspiration or reference image. It must be an image file no larger than 10 MB. Each item can also have its own reference image.",
    example: "A photo of the complete bridal-party colour theme.",
  },
];

const itemFields: ManualField[] = [
  {
    field: "Receiving member",
    meaning: "Shown only for a group order. It identifies the person receiving this particular item. Every group item must have a recipient before the order can be created.",
    example: "Achieng Otieno",
  },
  {
    field: "Item / garment name",
    required: true,
    meaning: "A clear name for a tailored item or alteration. Ready-made and material sales use Product from inventory instead. Service items use Service name.",
    example: "Kitenge midi dress",
  },
  {
    field: "Product from inventory",
    required: true,
    meaning: "For Ready-made or Material Sale, choose the actual stock record. FundiFlow shows its SKU, stock quantity, unit, and selling price and prevents a quantity above available stock.",
    example: "Navy school sweater (SWT-NVY-32) - Stock 8 pcs",
  },
  {
    field: "Quantity / Number of sets",
    required: true,
    meaning: "How many identical units or packages are being sold. The value must be at least 1. For a package, included-piece quantities are per set.",
    example: "2 school-uniform sets",
  },
  {
    field: "Unit / package price (KES)",
    required: true,
    meaning: "The selling price for one item or for one complete package. A package's included pieces do not get separate prices.",
    example: "4,500 for one dress",
  },
  {
    field: "Discount (KES)",
    meaning: "A fixed shilling discount for this line, not a percentage. Line total equals price multiplied by quantity, less the discount, and never goes below zero.",
    example: "500 off two uniforms: 4,000 x 2 - 500 = 7,500",
  },
  {
    field: "Assigned tailor",
    meaning: "Shown on Tailored and Alteration items. Use it when this item belongs to a specific maker. It can differ from the order-level tailor.",
    example: "Peter handles the trouser while Esther handles the coat.",
  },
  {
    field: "Included pieces",
    meaning: "Non-priced components inside one priced package. Add a piece name, quantity per set, and optional detail. Leave empty for a normal single item.",
    example: "Suit package: 1 coat, 2 trousers, 1 waistcoat.",
  },
  {
    field: "Measurements",
    meaning: "Shown for tailored and alteration work. Use Add measurements to record bust, waist, hips, shoulder, sleeve, length, inseam, neck, thigh, or a custom field in centimetres.",
    example: "Bust 96; Waist 80; Hips 104; Sleeve 58; Length 112.",
  },
  {
    field: "Notes / style details",
    meaning: "Instructions for this item only. Be specific enough that the assigned tailor does not need to guess.",
    example: "Elbow-length sleeves, hidden side zip, two side pockets.",
  },
  {
    field: "Reference image",
    meaning: "An image for this exact item, up to 10 MB. Use it when different items in the same order have different designs.",
    example: "A photo showing the neckline requested for Amina's dress.",
  },
];

const deliveryFields: ManualField[] = [
  {
    field: "How customer gets order",
    required: true,
    meaning: "Choose Customer pickup when they collect from the shop, or Courier delivery when the order should be sent. Pickup removes the delivery fee from the receipt.",
    example: "Customer pickup",
  },
  {
    field: "Delivery fee (KES)",
    meaning: "Shown for courier delivery. It is added as a separate line to Order total and the receipt.",
    example: "350",
  },
  {
    field: "Delivery address",
    meaning: "The destination for this order. Use enough detail for the courier to find it; do not rely only on the customer's saved address.",
    example: "ABC Towers, 4th Floor, Waiyaki Way, Nairobi",
  },
  {
    field: "Assign courier",
    meaning: "Choose an active delivery partner or Assign later. Couriers are configured in Delivery settings.",
    example: "Musa - City Rider Services",
  },
  {
    field: "Delivery notes",
    meaning: "Handover instructions that help this delivery succeed.",
    example: "Call Amina on arrival; reception closes at 6 pm.",
  },
];

const itemTypes = [
  {
    title: "Tailored",
    icon: Scissors,
    use: "A garment made or customised by your workshop from measurements.",
    example: "Kitenge midi dress, one piece, KES 4,500.",
    watch: "Name the garment, add measurements and style details, and assign a tailor when known.",
  },
  {
    title: "Ready-made",
    icon: Shirt,
    use: "A finished product already held in Inventory and sold from stock.",
    example: "Navy school sweater, size 32, two pieces.",
    watch: "Select the actual inventory item. The requested quantity cannot exceed available stock.",
  },
  {
    title: "Alteration",
    icon: Wrench,
    use: "Work that changes or repairs an existing garment.",
    example: "Shorten trouser and reduce waist, KES 800.",
    watch: "Describe exactly what changes, add relevant measurements, and assign the person doing the alteration.",
  },
  {
    title: "Material Sale",
    icon: Boxes,
    use: "Fabric or another saleable material sold directly from Inventory.",
    example: "Three metres of Ankara print at KES 650 per metre.",
    watch: "Select the inventory record and check that quantity and unit match what the customer is buying.",
  },
  {
    title: "Service",
    icon: PackageCheck,
    use: "A chargeable service that is not itself a garment or stock product.",
    example: "Logo embroidery on five shirts, KES 1,500.",
    watch: "Use a clear service name, quantity, price, and instructions. Measurements are not shown for service items.",
  },
] as const;

export default function OrdersManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="Complete orders guide"
        title="Create, price, produce, deliver, and close an order"
        description="An order can contain tailored garments, ready-made stock, alterations, material sales, services, or a mixture. Every priced line keeps its own recipient, quantity, price, instructions, measurements, image, and production responsibility."
        actionHref="/orders/new"
        actionLabel="Start a new order"
      />

      <nav aria-label="On this page" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">On this page</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-emerald-700">
          <a href="#before" className="hover:underline">Before you start</a>
          <a href="#order-details" className="hover:underline">Order details</a>
          <a href="#item-types" className="hover:underline">Item types</a>
          <a href="#item-fields" className="hover:underline">Item fields</a>
          <a href="#packages" className="hover:underline">Packages</a>
          <a href="#group-orders" className="hover:underline">Group orders</a>
          <a href="#delivery-payment" className="hover:underline">Delivery and payment</a>
          <a href="#after-save" className="hover:underline">After saving</a>
          <a href="#orders-page" className="hover:underline">Orders page</a>
        </div>
      </nav>

      <section id="before" className="space-y-4 scroll-mt-24">
        <SectionHeading number={1} title="Prepare before opening New Order" description="A few correct records prevent duplicate names, missing members, and stock mistakes." />
        <Checklist items={[
          "The customer already exists in Customers.",
          "For a group, every garment recipient is saved under Members.",
          "Ready-made products and saleable materials exist in Inventory with current stock.",
          "Tailors are active under Employees if you want to assign work now.",
          "Active couriers exist in Delivery settings if delivery will be assigned now.",
          "You know the promised due date, prices, deposit, and delivery arrangement.",
        ]} />
        <Note warning><strong>Customer first, order second.</strong> If the customer is missing, go to <ProductLink href="/customers">Customers</ProductLink>, save them, then return to New Order. For a group, add members before starting so every item can be assigned to its recipient.</Note>
      </section>

      <section id="order-details" className="space-y-4 scroll-mt-24">
        <SectionHeading number={2} title="Complete the order-level details" description="These fields describe the whole order. Item-specific details are added in the next section." />
        <NumberedSteps steps={[
          { title: "Select the customer", text: "Search by name or phone. Use Customers or Groups to narrow the results." },
          { title: "Set responsibility and deadline", text: "Choose a default tailor when known and enter the date promised to the customer." },
          { title: "Record money already received", text: "Enter the initial payment only if cash, M-Pesa, or another payment has actually been received." },
          { title: "Add whole-order context", text: "Use design notes and one order reference image only when they apply to the order as a whole." },
        ]} />
        <FieldGuide fields={orderFields} />
      </section>

      <section id="item-types" className="space-y-4 scroll-mt-24">
        <SectionHeading number={3} title="Choose the correct item type" description="Use Package / set for one priced bundle. Otherwise choose the button that describes what this line actually is." />
        <div className="grid gap-3 md:grid-cols-2">
          {itemTypes.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="h-4 w-4" /></span>
                  <h3 className="font-bold text-slate-950">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.use}</p>
                <p className="mt-2 text-sm text-slate-800"><strong>Example:</strong> {item.example}</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong>Check:</strong> {item.watch}</p>
              </div>
            );
          })}
        </div>
        <Note><strong>Mixed order example:</strong> Amina can buy one tailored dress, one ready-made handbag, and an embroidery service on the same order. Add three separate items so stock, pricing, instructions, and production remain clear.</Note>
      </section>

      <section id="item-fields" className="space-y-4 scroll-mt-24">
        <SectionHeading number={4} title="Complete every order-item field" description="Add at least one item. A line must have a valid name or inventory product, quantity of at least one, and a price before Create order will succeed." />
        <FieldGuide fields={itemFields} />
        <ExampleCard title="Individual tailored-order example">
          <p><strong>Customer:</strong> Amina Wanjiku</p>
          <p><strong>Assigned tailor:</strong> Esther Njeri</p>
          <p><strong>Due date:</strong> 12 September 2026</p>
          <p><strong>Initial payment:</strong> KES 2,000</p>
          <p><strong>Item type:</strong> Tailored</p>
          <p><strong>Item:</strong> Kitenge midi dress; Quantity 1; Unit price KES 4,500; Discount KES 0</p>
          <p><strong>Measurements:</strong> Bust 96; Waist 80; Hips 104; Sleeve 58; Length 112</p>
          <p><strong>Style details:</strong> Elbow-length sleeves, hidden side zip, two side pockets</p>
          <p><strong>Delivery:</strong> Customer pickup</p>
          <p><strong>Result:</strong> Order total KES 4,500; Total paid KES 2,000; Balance due KES 2,500</p>
        </ExampleCard>
      </section>

      <section id="packages" className="space-y-4 scroll-mt-24">
        <SectionHeading number={5} title="Use Package / set when one price covers several pieces" description="A package is one priced parent item. Its Included pieces explain what must be made, but those pieces do not add their own prices." />
        <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-600" /><h3 className="font-bold text-slate-950">How to enter it</h3></div>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <li><strong className="text-slate-900">1.</strong> Press Package / set.</li>
              <li><strong className="text-slate-900">2.</strong> Name the parent package and enter Number of sets and Package price.</li>
              <li><strong className="text-slate-900">3.</strong> Under Included pieces, add each piece and its quantity per set.</li>
              <li><strong className="text-slate-900">4.</strong> Add measurements, style details, and a reference image for the package.</li>
            </ol>
          </div>
          <ExampleCard title="Men's suit package" tone="blue">
            <p><strong>Package / set name:</strong> Three-piece wedding suit</p>
            <p><strong>Number of sets:</strong> 1</p>
            <p><strong>Package price:</strong> KES 12,000</p>
            <p><strong>Included piece 1:</strong> Coat - quantity 1 - peak lapel</p>
            <p><strong>Included piece 2:</strong> Trouser - quantity 2 - one slim, one regular</p>
            <p><strong>Included piece 3:</strong> Waistcoat - quantity 1 - five buttons</p>
            <p><strong>Line total:</strong> KES 12,000. Do not price the coat, trousers, and waistcoat again.</p>
          </ExampleCard>
        </div>
        <Note warning><strong>Quantity is per set.</strong> If Number of sets is 2 and the included Trouser quantity is 2, the workshop must make four trousers in total.</Note>
      </section>

      <section id="group-orders" className="space-y-4 scroll-mt-24">
        <SectionHeading number={6} title="Create a group order" description="Selecting a Group customer adds order roles and a Receiving member field to every item." />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Receiving member", "The person who gets this item. Required on every group item."],
            ["Representative", "The optional group member who receives order communication. Leave blank to use the group contact."],
            ["Payer", "The optional person responsible for payment. Leave blank when the group account pays."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-700" /><h3 className="text-sm font-bold text-indigo-950">{title}</h3></div>
              <p className="mt-2 text-sm leading-6 text-indigo-900/80">{text}</p>
            </div>
          ))}
        </div>
        <NumberedSteps steps={[
          { title: "Select the group", text: "Choose Kijani Secondary School under the Groups filter in Customer." },
          { title: "Choose communication and payment roles", text: "Use Mary Njeri as representative if she should receive messages. Leave Payer on the group account when the school pays." },
          { title: "Add one item for each distinct recipient or requirement", text: "Choose Achieng Otieno as Receiving member for her uniform. Add another item for Brian Mwangi and his size." },
          { title: "Check every item", text: "Create order will stop if any group item has no Receiving member." },
        ]} />
        <ExampleCard title="Kijani School group order" tone="blue">
          <p><strong>Customer:</strong> Kijani Secondary School</p>
          <p><strong>Representative:</strong> Mary Njeri, school bursar</p>
          <p><strong>Payer:</strong> Kijani Secondary School pays</p>
          <p><strong>Achieng's item:</strong> School uniform set, quantity 1, KES 3,800, measurements from her member profile</p>
          <p><strong>Brian's item:</strong> Navy trouser, quantity 2, KES 1,500 each, assigned to Brian Mwangi</p>
          <p><strong>Billing result:</strong> Items remain traceable to each student while the invoice and balance stay on Kijani Secondary School.</p>
        </ExampleCard>
      </section>

      <section id="delivery-payment" className="space-y-4 scroll-mt-24">
        <SectionHeading number={7} title="Set delivery and verify the payment summary" description="Delivery changes the total. Check the three money cards before creating the order." />
        <FieldGuide fields={deliveryFields} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">Order total</p><p className="mt-2 text-sm leading-6 text-slate-700">All item line totals plus the delivery fee, if courier delivery is selected.</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">Total paid</p><p className="mt-2 text-sm leading-6 text-emerald-950">Starts with Initial payment. Enter only money already received.</p></div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-bold uppercase text-rose-700">Balance due</p><p className="mt-2 text-sm leading-6 text-rose-950">Order total minus Total paid. This cannot be negative.</p></div>
        </div>
        <ExampleCard title="Courier-delivery calculation" tone="amber">
          <p><strong>Items:</strong> Dress KES 4,500 + handbag KES 2,000 = KES 6,500</p>
          <p><strong>Delivery fee:</strong> KES 350</p>
          <p><strong>Order total:</strong> KES 6,850</p>
          <p><strong>Initial payment:</strong> KES 3,000</p>
          <p><strong>Balance due:</strong> KES 3,850</p>
        </ExampleCard>
      </section>

      <section id="create-confirm" className="space-y-4 scroll-mt-24">
        <SectionHeading number={8} title="Create the order and confirm it" description="The sticky total at the bottom should match the agreement with the customer." />
        <Checklist items={[
          "The correct customer or group is selected.",
          "Due date is realistic and agreed.",
          "Every item has the correct type, quantity, price, and fixed discount.",
          "Every group item has a Receiving member.",
          "Measurements and style details belong to the correct item.",
          "Initial payment is not more than Order total.",
          "Pickup or delivery, fee, address, and courier are correct.",
          "Reference images are image files no larger than 10 MB.",
        ]} />
        <Note>Press <strong>Create order</strong> once. FundiFlow opens the saved order detail page. If an overall order image fails after the order is saved, the order still exists and FundiFlow reports that the image was not uploaded.</Note>
      </section>

      <section id="after-save" className="space-y-4 scroll-mt-24">
        <SectionHeading number={9} title="Manage the order after saving" description="The order detail page is the working record used by sales, tailoring, production, payment, and delivery staff." />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Invoice / Receipt", "Open the printable customer document showing items, payments, and balance."],
            ["Edit order details", "Correct the due date, tailor, garment information, price, or design notes. Save the edit deliberately."],
            ["Edit an item", "Use the edit control on an order item to correct its details, included pieces, or reference image."],
            ["Production Stage", "Advance work through the configured stages. Stages configured to notify the customer may send an SMS; the ready-for-pickup milestone can send the pickup message."],
            ["Fittings & Adjustments", "Add a dated fitting note describing feedback, measurements, and changes requested."],
            ["Production Notes", "Keep internal workshop instructions and progress context for the order."],
            ["Materials Used", "Record the inventory material and exact quantity consumed. This is usage, not the customer-facing price."],
            ["Delay Notification", "Enter a new expected ready date, add an optional reason, and send the customer an SMS."],
            ["Delivery", "Save partner and delivery details, then advance pickup or courier stages until handover is complete."],
            ["Returns & Alterations", "After delivery or customer pickup, start a return and move it through inspection, alteration, quality check, ready for pickup, and completion."],
            ["Cancel Order", "Record a reason, refund status or amount, and any cancellation fee. The order is retained for audit; it is not deleted."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>
            </div>
          ))}
        </div>
        <Note warning><strong>Production stage and delivery stage are separate.</strong> Production says whether the item is being cut, sewn, fitted, finished, or ready. Delivery says whether the completed order is awaiting pickup, with a courier, delivered, or picked up. Update both when their real-world event happens.</Note>
      </section>

      <section id="orders-page" className="space-y-4 scroll-mt-24">
        <SectionHeading number={10} title="Read the Orders tab correctly" description="The Orders page summarizes work and gives direct routes into production, finance, payments, and each saved order." />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {[
              ["Today / This Week / This Month / This Year / All Time", "Filters orders by their due date. A custom calendar date also matches due date."],
              ["Total Orders", "Number of orders in the selected due-date period."],
              ["Active Orders", "Orders not delivered and not cancelled. The card links to the Production Board."],
              ["Delivered", "Completed delivery records in the selected period. The card opens the Delivered tab."],
              ["Total Value", "Combined order subtotal value for the selected period. Use Finance for the financial view."],
              ["Total Paid", "Payments recorded against those orders. Use Payments for payment records."],
              ["Urgent Deliveries", "Orders due today."],
              ["Active Orders table", "Open the green order number to manage one order. Columns show customer, stage, due date, total paid, and balance."],
              ["Delivered / Cancelled", "Switch the lower table between delivered records and cancellation records with reason and refund status."],
            ].map(([title, text]) => (
              <div key={title} className="grid gap-1 px-4 py-3 sm:grid-cols-[250px_minmax(0,1fr)] sm:gap-4">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="order-next" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold text-slate-950">Use the live order pages</h2></div>
        <p className="mt-2 text-sm leading-6 text-slate-600">Open Orders to review existing work, or start New Order when the customer and required setup are ready.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <ProductLink href="/orders">Open Orders</ProductLink>
          <ProductLink href="/orders/new">Start New Order</ProductLink>
          <Link href="/manual/customers" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-emerald-700 hover:underline">Review Customers guide <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>
    </div>
  );
}
