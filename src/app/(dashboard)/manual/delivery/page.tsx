import {
  CircleAlert,
  MapPin,
  MessageSquareText,
  PackageCheck,
  RotateCcw,
  Settings2,
  Truck,
  UserRoundCheck,
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

const policyFields: ManualField[] = [
  {
    field: "Enable Delivery Management",
    required: true,
    meaning: "Turns the business delivery policy on or off. The interface states that switching it off makes customer pickup the default for orders.",
    example: "Keep it on for a Nairobi shop that sends finished garments by rider.",
  },
  {
    field: "Default Fulfilment",
    required: true,
    meaning: "Choose Home Delivery or Customer Pickup as the starting choice on every new order. Staff can still choose the other method while creating a particular order.",
    example: "Home Delivery for a business that usually sends uniforms to schools.",
  },
  {
    field: "Default Delivery Fee (KES)",
    required: true,
    meaning: "The delivery charge suggested on a new courier-delivery order. It must be zero or more. Pickup orders always save a delivery fee of zero.",
    example: "KES 450 for deliveries within Nairobi CBD and nearby estates.",
  },
  {
    field: "Free Delivery Above (KES)",
    meaning: "The optional goods-total threshold in your delivery policy for free delivery. Leave it blank when the business has no free-delivery offer.",
    example: "KES 20,000 for a large school-uniform order.",
  },
  {
    field: "Auto-deliver ready-made orders",
    required: true,
    meaning: "When enabled, ready-made items that need no alteration skip the production queue. Courier orders are completed automatically; pickup orders become Ready for Pickup.",
    example: "A ready-made sweater sold without alterations does not wait in Cutting or Stitching.",
  },
];

const partnerFields: ManualField[] = [
  {
    field: "Name",
    required: true,
    meaning: "The rider or contact person staff will recognise when assigning an order.",
    example: "John Kamau.",
  },
  {
    field: "Phone",
    required: true,
    meaning: "A reachable courier telephone number for handover and delivery follow-up.",
    example: "+254 722 456 789.",
  },
  {
    field: "Company",
    meaning: "The courier company or delivery business the partner works with.",
    example: "Swift Couriers Nairobi.",
  },
  {
    field: "Vehicle Type",
    meaning: "The transport normally used, which helps staff choose a partner suitable for the package.",
    example: "Motorcycle for a garment bag; van for 120 school uniforms.",
  },
  {
    field: "Registration",
    meaning: "The vehicle registration used to verify the rider or vehicle at collection.",
    example: "KMDQ 418R.",
  },
  {
    field: "Notes",
    meaning: "Useful operating details, service areas, availability, or special handling information.",
    example: "Available Monday–Saturday; call 30 minutes before a school delivery.",
  },
  {
    field: "Active",
    required: true,
    meaning: "Only active partners appear when assigning a courier on a new or saved order. Use Inactive to pause assignments without deleting the record.",
    example: "Set John to Inactive while his motorcycle is under repair.",
  },
];

const orderDeliveryFields: ManualField[] = [
  {
    field: "How will the customer get this order?",
    required: true,
    meaning: "Choose Courier delivery or Customer pickup. The choice controls the fields, charges, and delivery stages used after production.",
    example: "Courier delivery for a customer in Westlands; Customer pickup for a customer collecting in Ngara.",
  },
  {
    field: "Delivery fee (KES)",
    meaning: "Shown only for courier delivery. It becomes a separate line in the order total and receipt. Enter zero when delivery is free.",
    example: "KES 450 added to a KES 12,000 dress order.",
  },
  {
    field: "Delivery address",
    meaning: "Shown only for courier delivery. Enter enough detail for the rider to find the destination without relying on the customer's saved profile.",
    example: "ABC Towers, 4th Floor, Waiyaki Way, Westlands; call at reception.",
  },
  {
    field: "Assign courier",
    meaning: "Choose an active delivery partner or Assign later. A saved order can receive or change its partner from the Delivery section.",
    example: "John Kamau — Swift Couriers (+254 722 456 789).",
  },
  {
    field: "Delivery notes",
    meaning: "Optional handover instructions, access details, preferred time, or handling information.",
    example: "Deliver after 3:00 p.m.; call Jane on arrival; leave all 12 uniforms with the school secretary.",
  },
];

const savedDeliveryFields: ManualField[] = [
  {
    field: "Assign Courier / Partner",
    meaning: "Select or change the active partner responsible for this saved courier order. Save before moving to Courier Assigned.",
    example: "Assign John Kamau after he confirms the 2:00 p.m. collection.",
  },
  {
    field: "Delivery Notes",
    meaning: "Update the instructions the dispatch team needs. Use Save Delivery Details after changing the partner or notes.",
    example: "Customer changed the destination to Sarit Centre customer-care desk.",
  },
];

const returnFields: ManualField[] = [
  {
    field: "Reason",
    required: true,
    meaning: "Choose Wrong size / poor fit, Defective workmanship or material, Wrong garment / item delivered, Damaged in transit, Wrong colour or fabric, Customer changed their mind, or Other reason.",
    example: "Wrong size / poor fit for trousers that are too tight at the waist.",
  },
  {
    field: "Notes",
    meaning: "Describe the problem and the correction agreed with the customer.",
    example: "Open waistband by 4 cm and preserve the original side-pocket position.",
  },
  {
    field: "Additional Charge (KES)",
    meaning: "Any extra amount agreed for the alteration or remake. Use zero when the business will correct the issue at no charge.",
    example: "KES 0 for a workmanship correction; KES 800 for a customer-requested redesign.",
  },
  {
    field: "Expected Ready Date",
    meaning: "The date promised for the corrected order to be ready again.",
    example: "8 September 2026.",
  },
];

const cancellationFields: ManualField[] = [
  {
    field: "Reason",
    required: true,
    meaning: "The clear reason the undelivered order is being cancelled. The order remains in the audit history.",
    example: "Customer relocated before the garment was completed.",
  },
  {
    field: "Notes",
    meaning: "Optional supporting context about the decision or agreement with the customer.",
    example: "Customer confirmed cancellation by phone on 3 September.",
  },
  {
    field: "Refund",
    meaning: "Choose No refund, Refund pending, or Refunded to record the current refund position.",
    example: "Refund pending while the owner approves repayment of the deposit.",
  },
  {
    field: "Refund Amount (KES)",
    meaning: "Shown when a refund is pending or completed. Enter the amount due or already returned; the form shows how much the customer paid so far.",
    example: "KES 5,000 deposit to be refunded.",
  },
  {
    field: "Cancellation Fee (KES)",
    meaning: "An agreed fee retained or still due after cancellation. If charged, it becomes the new outstanding balance.",
    example: "KES 1,500 for fabric already cut for the cancelled garment.",
  },
];

export default function DeliveryManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual · Delivery"
        title="Move every finished order safely from the workshop to the customer"
        description="Set the delivery policy once, capture the correct fulfilment details on each order, hand completed work to the right courier or customer, update every real milestone, and keep exceptions and returns traceable."
        actionHref="/delivery"
        actionLabel="Open Delivery Board"
      />

      <Note>
        <strong>Delivery and production are separate:</strong> production records the work being cut, stitched, fitted, and finished. Delivery records how the completed order leaves the business. The Ready for Pickup production milestone hands the order into the correct courier or pickup flow.
      </Note>

      <section id="delivery-map" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={1}
          title="Understand the complete delivery flow"
          description="The same order moves through setup, order capture, production handoff, fulfilment, and final confirmation."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ExampleCard title="1 · Set policy">
            <p>Choose the normal fulfilment method, delivery fee, free-delivery threshold, ready-made behaviour, SMS milestones, and active courier partners.</p>
          </ExampleCard>
          <ExampleCard title="2 · Capture the order" tone="blue">
            <p>Choose courier delivery or pickup. For delivery, confirm the fee, exact address, partner if known, and handover notes.</p>
          </ExampleCard>
          <ExampleCard title="3 · Finish production" tone="amber">
            <p>When the order reaches the production stage carrying the Ready for Pickup milestone, FundiFlow starts its courier or pickup delivery branch.</p>
          </ExampleCard>
          <ExampleCard title="4 · Confirm handover">
            <p>Advance only after each real event. Complete the final Delivered or Picked by Customer milestone, then manage any return from the saved order.</p>
          </ExampleCard>
        </div>
        <ExampleCard title="End-to-end Nairobi example" tone="emerald">
          <p>A customer orders a KES 12,000 kitenge dress for delivery to Westlands. The shop charges KES 450, records the building and reception instructions, and assigns John Kamau. When finishing is complete, the order becomes Ready for Dispatch. Staff confirm John, hand over the packed dress, follow it through transit, verify receipt with the customer, and finish the order as Delivered.</p>
        </ExampleCard>
      </section>

      <section id="delivery-policy" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={2}
          title="Configure the Delivery Policy"
          description="Open Delivery Settings from the Delivery Board before the team starts creating orders. These values become defaults, not a substitute for checking each order."
        />
        <NumberedSteps
          steps={[
            { title: "Open Delivery Settings", text: "From Delivery, select Delivery Settings. Review the current policy instead of assuming the system defaults match the business." },
            { title: "Set the fulfilment defaults", text: "Choose whether delivery management is enabled, the normal method, the standard fee, and an optional free-delivery threshold." },
            { title: "Choose ready-made behaviour", text: "Enable auto-delivery only when ready-made items without alterations should skip production. Pickup orders still wait for customer collection." },
            { title: "Save the policy", text: "Select Save Delivery Settings. The summary beside the button shows the current default method and fee." },
          ]}
        />
        <FieldGuide fields={policyFields} />
        <Note warning>
          A delivery fee is editable on every new order. Always confirm the amount shown in the order total and receipt, especially for a different town, a bulky group order, or an order that qualifies for free delivery.
        </Note>
        <p className="text-sm"><ProductLink href="/settings/delivery">Open Delivery Settings</ProductLink></p>
      </section>

      <section id="delivery-partners" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={3}
          title="Add and maintain courier partners"
          description="Partners are riders or courier contacts that can be assigned to orders. Their status controls whether they appear in order forms."
        />
        <NumberedSteps
          steps={[
            { title: "Select Add Partner", text: "Enter at least the partner's name and phone. Add company, vehicle, registration, and notes when they improve verification or assignment." },
            { title: "Keep Active accurate", text: "Active partners appear in assignment lists. Select the Active badge to make a partner Inactive when temporarily unavailable." },
            { title: "Edit changes", text: "Use the pencil to update contact or vehicle details. An old partner name remains on an existing order because the order keeps its saved display name." },
            { title: "Remove only when appropriate", text: "The bin action asks for confirmation and removes the partner from the business list. Use Inactive when the relationship may resume." },
          ]}
        />
        <FieldGuide fields={partnerFields} />
        <ExampleCard title="Courier partner example" tone="blue">
          <p>Add <strong>John Kamau</strong>, phone <strong>+254 722 456 789</strong>, company <strong>Swift Couriers Nairobi</strong>, vehicle <strong>Motorcycle</strong>, registration <strong>KMDQ 418R</strong>, with the note <strong>CBD, Westlands, Parklands; no Sunday deliveries</strong>. Keep him Active only while he is available.</p>
        </ExampleCard>
      </section>

      <section id="new-order-delivery" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={4}
          title="Set fulfilment correctly on the new order"
          description="The Delivery card appears near the payment summary on New Order. Its choices affect the receipt, total, Delivery Board, and later status path."
        />
        <NumberedSteps
          steps={[
            { title: "Choose the method", text: "Use Courier delivery when the business will send the order. Use Customer pickup when the customer or representative will collect from the shop." },
            { title: "Complete courier details", text: "For delivery, confirm the fee, enter the complete destination, assign an active courier now or later, and add practical notes." },
            { title: "Check the payment summary", text: "Courier fees are added to the Order total and balance. Pickup removes the delivery fee and clears address and courier selections." },
            { title: "Create and re-open the order", text: "After saving, open the order and review its Delivery section. Fulfilment, fee, address, and saved partner should match the agreement." },
          ]}
        />
        <FieldGuide fields={orderDeliveryFields} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ExampleCard title="Courier order">
            <p>For order <strong>ORD-1048</strong>, choose Courier delivery, fee <strong>KES 450</strong>, address <strong>ABC Towers, 4th Floor, Waiyaki Way, Westlands</strong>, and note <strong>Call Jane at reception</strong>.</p>
          </ExampleCard>
          <ExampleCard title="Customer pickup" tone="blue">
            <p>For Margaret's school-uniform order, choose Customer pickup. No delivery fee appears on the receipt. When production finishes, the order waits at Ready for Pickup until Margaret collects it.</p>
          </ExampleCard>
        </div>
        <p className="text-sm"><ProductLink href="/orders/new">Start a New Order</ProductLink></p>
      </section>

      <section id="production-handoff" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={5}
          title="Hand the completed order from Production to Delivery"
          description="A delivery should not start while tailoring work is incomplete. The production milestone creates the correct first fulfilment stage."
        />
        <Checklist
          items={[
            "Confirm every included garment or order item is complete, quality-checked, packed, and labelled for the correct customer or group member.",
            "Advance Production to the stage configured with the Ready for Pickup milestone only when the physical package is ready to leave the work area.",
            "A courier order moves from Pending to Ready for Dispatch; a pickup order moves from Pending to Ready for Pickup.",
            "A ready-made order with no alterations may skip production when Auto-deliver ready-made orders is enabled.",
            "For a ready-made courier order, automatic completion can mark it Delivered immediately; for pickup, it becomes Ready for Pickup until collection.",
            "Production and delivery status may be reviewed on the same saved order, but each status describes a different real-world responsibility.",
          ]}
        />
        <Note warning>
          Do not use Ready for Dispatch to mean “almost finished.” It means the order is complete, packed, and ready for a courier handover.
        </Note>
        <p className="text-sm"><ProductLink href="/production">Open Production</ProductLink></p>
      </section>

      <section id="delivery-board" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={6}
          title="Use the Delivery Board as the dispatch queue"
          description="The board lists orders with their current fulfilment information and provides the next available delivery action."
        />
        <Checklist
          items={[
            "Use All for the full list, including orders still Pending and pickup orders already collected.",
            "Use Ready for Dispatch, Courier Assigned, Picked Up, In Transit, Attempted, Ready for Pickup, Delivered, or Cancelled to focus the queue. Each chip shows its order count.",
            "Each card shows the order number, customer, delivery badge, pickup label where relevant, address, courier, delivery fee, unpaid balance, and order due date when available.",
            "Select the order number or Open for the full order. Use the Advance button only after the named event has happened in the real world.",
            "Cancelled cards are faded, show their cancellation date, and cannot be advanced.",
            "Picked by Customer is visible on its card in All; the current board does not have a separate collected-pickup filter.",
          ]}
        />
        <ExampleCard title="Morning dispatch check" tone="amber">
          <p>Filter <strong>Ready for Dispatch</strong>. Before assigning ORD-1048, confirm the garment bag, customer phone, Westlands address, KES 450 fee, and any outstanding balance. Open the order to save John Kamau and the latest reception instructions, then advance the stage.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/delivery">Open Delivery Board</ProductLink></p>
      </section>

      <section id="courier-flow" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={7}
          title="Advance a courier delivery through every stage"
          description="The order and Delivery Board offer the next stage. Each advance creates a delivery event and a team notification."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Ready for Dispatch", "Production is complete and the packed order is waiting for courier assignment."],
            ["Courier Assigned", "The responsible partner is confirmed. Save the partner and notes before advancing."],
            ["Picked Up", "The courier has physically collected the correct package from the business."],
            ["In Transit", "The courier is actively taking the order to the customer."],
            ["Delivery Attempted", "A handover was attempted. Record the outcome in notes and retry only after correcting the problem."],
            ["Delivered", "The customer or authorised recipient has received the complete order."],
          ].map(([title, text], index) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stage {index + 1}</p>
              <h3 className="mt-1 font-bold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <FieldGuide fields={savedDeliveryFields} />
        <NumberedSteps
          steps={[
            { title: "Save dispatch details", text: "Open the order, select the active courier, update Delivery Notes, and choose Save Delivery Details." },
            { title: "Advance one real event at a time", text: "Use the order's Move to action or the board's Advance action. Never mark Picked Up while the package is still in the shop." },
            { title: "Verify final receipt", text: "Confirm the recipient and package before completing delivery. If the board offers a retry after an unsuccessful attempt, return it to In Transit; the order's Delivered production milestone can synchronise a successful final handover to Delivered." },
          ]}
        />
        <ExampleCard title="Successful courier handover">
          <p>John collects ORD-1048 at 2:10 p.m.; advance to Picked Up. When he leaves for Westlands, advance to In Transit. After Jane confirms the sealed dress arrived complete, finish the order as Delivered and check that the delivery date is shown on the saved order.</p>
        </ExampleCard>
      </section>

      <section id="pickup-flow" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={8}
          title="Complete a customer pickup"
          description="Pickup has a shorter path because no courier, delivery address, or fee is required."
        />
        <NumberedSteps
          steps={[
            { title: "Ready for Pickup", text: "Production is finished and the package is available within business working hours. Confirm the order number, customer name, balance, and collection instructions." },
            { title: "Verify the collector", text: "Match the customer or authorised representative with the order. For a group, confirm the receiving member or representative and every package included." },
            { title: "Collect payment where required", text: "Use Payments to record money received. FundiFlow displays the balance on the board but does not replace the business's handover policy." },
            { title: "Picked by Customer", text: "Advance only after the package has physically left with the verified collector. This is the terminal pickup stage." },
          ]}
        />
        <ExampleCard title="School-uniform pickup" tone="blue">
          <p>Margaret arrives with order number ORD-1052 to collect two uniforms. Staff confirm her phone, check both labelled packages, record the final KES 3,500 in Payments, obtain the business's normal handover confirmation, and then move the order to <strong>Picked by Customer</strong>.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/payments">Open Payments</ProductLink></p>
      </section>

      <section id="delivery-messages" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={9}
          title="Choose customer SMS milestones and understand notifications"
          description="Delivery Settings controls which courier milestones send a customer text. Stage changes also create team notifications."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Ready for Dispatch", "The order is complete, packed, and awaiting a courier."],
            ["Courier Assigned", "A courier or partner has been assigned."],
            ["Picked Up", "The courier collected the package."],
            ["In Transit", "The order is on the way."],
            ["Delivery Attempted", "The attempt was unsuccessful and the customer should be available for a retry."],
            ["Delivered", "The courier delivered the order, or the customer completed pickup."],
          ].map(([title, text]) => (
            <ExampleCard key={title} title={title}>
              <p>{text}</p>
            </ExampleCard>
          ))}
        </div>
        <Checklist
          items={[
            "A customer SMS can be sent only when the order has a customer phone number and that milestone's toggle is on.",
            "The Ready for Pickup message is tied to the production stage carrying the Ready for Pickup milestone; it is separate from the courier Picked Up toggle.",
            "Messages use the customer name, first order item where available, order number, and business wording.",
            "An SMS failure does not reverse a successful delivery-stage update. Check Messages or the SMS log when the customer says no text arrived.",
            "Do not advance a stage merely to send another message; the delivery history must describe what actually happened.",
            "Keep milestone toggles limited to updates customers will understand and find useful.",
          ]}
        />
        <ExampleCard title="Customer message example" tone="emerald">
          <p>When ORD-1048 moves to In Transit and that SMS toggle is enabled, Jane receives an update that her dress order is on the way. If the SMS provider fails, the stage can still be In Transit, so staff should call when the delivery is urgent.</p>
        </ExampleCard>
      </section>

      <section id="exceptions" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={10}
          title="Handle failed attempts and cancellations without losing the audit trail"
          description="An exception should explain what happened, what happens next, and any money owed or refunded."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-950"><CircleAlert className="h-5 w-5" /><h3 className="font-bold">Unsuccessful attempt</h3></div>
            <p className="mt-2 text-sm leading-6 text-amber-900">Use Delivery Attempted when the courier reached the destination but could not hand over the order. Add a useful note on the saved order, contact the customer, correct the address or time, and return the order to In Transit only when a real retry begins.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-2 text-rose-950"><PackageCheck className="h-5 w-5" /><h3 className="font-bold">Cancellation</h3></div>
            <p className="mt-2 text-sm leading-6 text-rose-900">An order can be cancelled before Delivered or Picked by Customer. Cancellation does not delete it: the record moves to the Cancelled board filter with its reason, date, refund state, and cancellation amount information.</p>
          </div>
        </div>
        <ExampleCard title="Failed-delivery example" tone="amber">
          <p>John reaches an apartment in Kilimani but the customer is unreachable and security will not accept the package. Mark Delivery Attempted, note the call attempts and gate restriction, contact the customer, agree 10:00 a.m. the next day, then move back to In Transit when John starts the retry.</p>
        </ExampleCard>
        <h3 className="text-base font-bold text-slate-950">Cancellation fields</h3>
        <FieldGuide fields={cancellationFields} />
        <Note warning>
          Do not cancel an order to correct a delivery stage. Cancel only when the actual order agreement has ended, and confirm any refund or fee with the owner before saving.
        </Note>
      </section>

      <section id="returns" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={11}
          title="Start and complete a return or alteration after delivery"
          description="Returns & Alterations becomes available only after Delivered or Picked by Customer. It creates a separate correction cycle without erasing the original handover."
        />
        <NumberedSteps
          steps={[
            { title: "Open the delivered order", text: "Expand Returns & Alterations and select Start Return. Confirm that the physical item has come back or the business has formally accepted the return." },
            { title: "Record the agreement", text: "Choose the required reason, explain the work in Notes, enter any Additional Charge, and set the Expected Ready Date." },
            { title: "Move through the correction", text: "Use Inspect, Alter / Remake, Quality Check, Ready, and Completed as the returned item moves through the workshop." },
            { title: "Preserve the history", text: "The card shows the reason, return date, staff member, status, notes, charge, and expected date. Remove a return only if it was created in error." },
          ]}
        />
        <FieldGuide fields={returnFields} />
        <ExampleCard title="Poor-fit return example" tone="blue">
          <p>Jane returns the delivered dress because the waist is 4 cm too tight. Choose <strong>Wrong size / poor fit</strong>, describe the alteration, set <strong>KES 0</strong> because the shop accepts responsibility, promise 8 September, then advance Inspect → Alter / Remake → Quality Check → Ready → Completed.</p>
        </ExampleCard>
      </section>

      <section id="delivery-routine" className="scroll-mt-24 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-lg font-bold text-emerald-950">Daily delivery routine</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">In the morning, review Ready for Dispatch and Ready for Pickup. Confirm packages, addresses, couriers, notes, balances, and customer phones. During the day, advance only verified events and act on attempts immediately. Before closing, reconcile all packages that left the shop with Delivered, Picked by Customer, In Transit, Attempted, or a clearly documented exception.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Settings2, label: "Delivery Settings", href: "/settings/delivery" },
                { icon: PackageCheck, label: "Production queue", href: "/production" },
                { icon: Truck, label: "Delivery Board", href: "/delivery" },
                { icon: UserRoundCheck, label: "Customer orders", href: "/orders" },
                { icon: MapPin, label: "New Order", href: "/orders/new" },
                { icon: MessageSquareText, label: "Messages", href: "/messages" },
                { icon: RotateCcw, label: "Delivered orders", href: "/orders" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <ProductLink key={`${item.href}-${item.label}`} href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </ProductLink>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
