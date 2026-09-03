import Link from "next/link";
import { ArrowRight, Building2, Search, User } from "lucide-react";

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

const individualFields: ManualField[] = [
  {
    field: "Full name",
    required: true,
    meaning: "The customer's own name. Use the name you will search for, print on their order, and recognize later. It must contain at least two characters.",
    example: "Amina Wanjiku",
  },
  {
    field: "Gender",
    meaning: "Male or Female. Use it when it helps your team interpret the customer's garment and measurement record. Leave it blank if it is not needed.",
    example: "Female",
  },
  {
    field: "Phone",
    required: true,
    meaning: "A valid Kenyan contact number. FundiFlow uses it for contact and order messages, so do not enter the workshop's number. You may type the familiar local or +254 format.",
    example: "+254 712 345 678",
  },
  {
    field: "Email",
    meaning: "A valid customer email address. Leave it empty when the customer does not use email; do not enter made-up text.",
    example: "amina.wanjiku@example.com",
  },
  {
    field: "Measurements (cm)",
    meaning: "Reusable body measurements. Press Add, name the measurement, then enter a positive number in centimetres. Add only measurements you actually took.",
    example: "Bust 96, Waist 80, Hips 104, Length 112",
  },
  {
    field: "Style preferences",
    meaning: "Choices that normally remain true across several orders. Put instructions for only one garment on that order instead.",
    example: "Prefers a relaxed fit, elbow-length sleeves, and dresses below the knee.",
  },
  {
    field: "Notes",
    meaning: "Useful customer-level context that is not a measurement or style preference. Keep it short, factual, and safe for staff to read.",
    example: "Usually available for fittings after 5:30 pm.",
  },
];

const groupFields: ManualField[] = [
  {
    field: "Organization name",
    required: true,
    meaning: "The school, company, church, chama, hotel, team, or family name that owns the billing account. It must contain at least two characters.",
    example: "Kijani Secondary School",
  },
  {
    field: "Contact person",
    meaning: "The person your workshop should call about the account. This is not automatically a uniform recipient; add them as a member too if they receive an item.",
    example: "Mary Njeri",
  },
  {
    field: "Contact role",
    meaning: "The contact person's job or responsibility, so staff know why they are calling them.",
    example: "School bursar",
  },
  {
    field: "Billing phone",
    required: true,
    meaning: "The valid Kenyan number used for group communication and billing follow-up. Confirm it with the organization before saving.",
    example: "+254 722 456 789",
  },
  {
    field: "Email",
    meaning: "The account or contact email. Use the address that should receive business communication.",
    example: "bursar@kijanischool.example",
  },
  {
    field: "Tax ID (PIN)",
    meaning: "The organization's tax PIN when they require it on business records. Leave it empty when it does not apply.",
    example: "P051234567A",
  },
  {
    field: "Payment terms",
    meaning: "Plain-language agreement for when the organization should pay. This records the agreement; it does not automatically move a due date or collect payment.",
    example: "50% deposit, balance within 14 days of delivery",
  },
  {
    field: "Address",
    meaning: "The organization's useful physical or postal location, especially when delivery or an invoice needs it.",
    example: "Kangundo Road, Nairobi",
  },
  {
    field: "Notes",
    meaning: "Account instructions that staff should see but that do not belong in the fields above.",
    example: "Purchase order number is required before production starts.",
  },
];

const memberFields: ManualField[] = [
  { field: "Full name", required: true, meaning: "The individual person receiving garments under the group account.", example: "Achieng Otieno" },
  { field: "Phone", meaning: "The member's own number. It may be left empty when communication goes only through the group representative.", example: "+254 711 234 567" },
  { field: "Email", meaning: "The member's own email, if the organization wants it recorded.", example: "achieng.otieno@example.com" },
  { field: "Gender", meaning: "Male or Female, when useful for the member's garment record.", example: "Female" },
  { field: "Department", meaning: "The class, department, branch, team, or work unit used to identify the member inside the group.", example: "Form 2 East" },
  { field: "Bust / Waist / Hips / Length", meaning: "The four quick member measurements shown in the add-member form. Enter numbers in centimetres and leave any untaken measurement blank.", example: "Bust 88, Waist 72, Hips 96, Length 105" },
];

export default function CustomersManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="Customers guide"
        title="Add individual customers, group accounts, and group members correctly"
        description="Use an Individual for one person who owns their account. Use Group / Org when a school, company, church, hotel, team, chama, or family owns the bill and several people may receive garments."
        actionHref="/customers"
        actionLabel="Open Customers"
      />

      <nav aria-label="On this page" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">On this page</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-emerald-700">
          <a href="#choose-type" className="hover:underline">Choose a type</a>
          <a href="#individual" className="hover:underline">Add an individual</a>
          <a href="#group" className="hover:underline">Add a group</a>
          <a href="#members" className="hover:underline">Add group members</a>
          <a href="#customer-list" className="hover:underline">Use the Customers page</a>
        </div>
      </nav>

      <section id="choose-type" className="space-y-4 scroll-mt-24">
        <SectionHeading number={1} title="Choose the correct customer type" description="This choice controls who owns the balance and whether the account can contain members." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><User className="h-4 w-4" /></span>
              <h3 className="font-bold text-slate-950">Individual</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Choose this when one named person places the order, receives the garment, and carries the balance.</p>
            <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950"><strong>Example:</strong> Amina orders one kitenge dress and pays for it herself.</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Building2 className="h-4 w-4" /></span>
              <h3 className="font-bold text-slate-950">Group / Org</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Choose this when an organization or household owns one billing account and named members receive different items.</p>
            <p className="mt-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950"><strong>Example:</strong> Kijani School orders uniforms for 20 students and the school pays the invoice.</p>
          </div>
        </div>
        <Note warning><strong>Do not create one group record for every member.</strong> Create the group once, open its profile, then add each recipient in the Members section. This keeps one group invoice while preserving each person's measurements and assigned garments.</Note>
      </section>

      <section id="individual" className="space-y-4 scroll-mt-24">
        <SectionHeading number={2} title="Add an individual customer" description="Open Customers. The Add Customer form is on the same page. Select Individual, complete the fields, then press Save customer." />
        <NumberedSteps steps={[
          { title: "Open the live page", text: "Go to Customers from the main menu. In Add Customer, keep Individual selected." },
          { title: "Enter identity and contact details", text: "Add the customer's real name and Kenyan phone number. Gender and email may be left blank." },
          { title: "Record reusable measurements", text: "Press Add for each measurement, type its name, and enter the centimetres measured today." },
          { title: "Separate preferences from order instructions", text: "Put lasting choices in Style preferences. Put garment-specific details on the order item later." },
          { title: "Save and confirm", text: "Press Save customer. Find the new name in All Customers and open it to check the profile." },
        ]} />
        <FieldGuide fields={individualFields} />
        <ExampleCard title="Complete individual example">
          <p><strong>Full name:</strong> Amina Wanjiku</p>
          <p><strong>Gender:</strong> Female</p>
          <p><strong>Phone:</strong> +254 712 345 678</p>
          <p><strong>Email:</strong> amina.wanjiku@example.com</p>
          <p><strong>Measurements:</strong> Bust 96 cm; Waist 80 cm; Hips 104 cm; Length 112 cm</p>
          <p><strong>Style preferences:</strong> Relaxed fit, elbow-length sleeves, dresses below the knee</p>
          <p><strong>Notes:</strong> Available for fittings after 5:30 pm</p>
        </ExampleCard>
      </section>

      <section id="group" className="space-y-4 scroll-mt-24">
        <SectionHeading number={3} title="Add a group or organization" description="In Add Customer, select Group / Org. Save the account first; members are added from the saved group profile." />
        <NumberedSteps steps={[
          { title: "Select Group / Org", text: "The form changes from personal fields to organization and billing fields." },
          { title: "Enter the account owner", text: "Use the organization's proper name, billing phone, contact person, and agreed payment details." },
          { title: "Save the group", text: "Press Save group. FundiFlow creates one account that owns the group invoice and balance." },
          { title: "Open the saved profile", text: "Find the group under the Groups filter and select its name. Use Members to add garment recipients." },
        ]} />
        <FieldGuide fields={groupFields} />
        <ExampleCard title="Complete group example" tone="blue">
          <p><strong>Organization name:</strong> Kijani Secondary School</p>
          <p><strong>Contact person:</strong> Mary Njeri</p>
          <p><strong>Contact role:</strong> School bursar</p>
          <p><strong>Billing phone:</strong> +254 722 456 789</p>
          <p><strong>Email:</strong> bursar@kijanischool.example</p>
          <p><strong>Tax ID:</strong> P051234567A</p>
          <p><strong>Payment terms:</strong> 50% deposit, balance within 14 days of delivery</p>
          <p><strong>Address:</strong> Kangundo Road, Nairobi</p>
          <p><strong>Notes:</strong> Purchase order number is required before production starts</p>
        </ExampleCard>
      </section>

      <section id="members" className="space-y-4 scroll-mt-24">
        <SectionHeading number={4} title="Add people under a group" description="Members are the real people receiving garments. Their garments appear under the group order, while the invoice and balance remain on the group account." />
        <NumberedSteps steps={[
          { title: "Open the group profile", text: "On Customers, select Groups and open Kijani Secondary School." },
          { title: "Open Members", text: "In the Members card, press Add member." },
          { title: "Enter the member's details", text: "Full name is required. Add contact, department, and measurements when available." },
          { title: "Save and repeat", text: "Press Add member. Repeat for every person who may receive an item in the group order." },
        ]} />
        <FieldGuide fields={memberFields} />
        <ExampleCard title="One school member" tone="blue">
          <p><strong>Full name:</strong> Achieng Otieno</p>
          <p><strong>Phone:</strong> +254 711 234 567</p>
          <p><strong>Gender:</strong> Female</p>
          <p><strong>Department:</strong> Form 2 East</p>
          <p><strong>Measurements:</strong> Bust 88 cm; Waist 72 cm; Hips 96 cm; Length 105 cm</p>
        </ExampleCard>
        <Note><strong>Contact, representative, payer, and recipient are different ideas.</strong> The group Contact person is the account contact. In a group order, Representative receives communication, Payer identifies who pays, and Receiving member identifies who gets each item. One person may fill several roles, but FundiFlow does not assume that automatically.</Note>
      </section>

      <section id="customer-list" className="space-y-4 scroll-mt-24">
        <SectionHeading number={5} title="Use the Customers page after saving" description="The page is both a directory and a quick view of account balances." />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Search", "Search by customer or organization name, phone, or email. The result list changes as you type."],
            ["All", "Shows every customer record, including group members."],
            ["Individuals", "Shows standalone people. Members linked under a group are not counted as standalone accounts."],
            ["Groups", "Shows organization billing accounts and their member count."],
            ["With Balance", "Shows billing accounts that still owe money."],
            ["Cleared", "Shows billing accounts whose outstanding balance is zero."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2"><Search className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-bold text-slate-900">{title}</h3></div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <Note warning><strong>A member does not carry a separate group balance.</strong> The member row is marked Member. Open the group account to understand the organization's invoice and outstanding balance.</Note>
      </section>

      <section id="customer-next" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">Before creating the first order</h2>
        <div className="mt-3"><Checklist items={[
          "The name belongs to the correct person or organization.",
          "The phone number belongs to the person who should receive communication.",
          "Measurements use clear names and centimetres.",
          "A group has every garment recipient saved as a member.",
          "Payment terms describe the actual agreement.",
          "Sensitive or unnecessary personal information is not in Notes.",
        ]} /></div>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <ProductLink href="/customers">Open Customers</ProductLink>
          <Link href="/manual/orders" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-emerald-700 hover:underline">Continue to the Orders guide <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>
    </div>
  );
}
