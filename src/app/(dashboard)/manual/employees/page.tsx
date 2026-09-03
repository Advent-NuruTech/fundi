import { KeyRound, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

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

const invitationFields: ManualField[] = [
  {
    field: "Employee Name",
    required: true,
    meaning: "The staff member's name shown on Team, assignments, and activity.",
    example: "Akinyi Otieno",
  },
  {
    field: "Email address",
    required: true,
    meaning: "The exact email the employee uses to sign in. FundiFlow converts it to lowercase before creating the invitation.",
    example: "akinyi@adventfabric.co.ke",
  },
  {
    field: "Role",
    required: true,
    meaning: "Select one or more jobs. Each role controls which FundiFlow pages and actions the employee can use.",
    example: "Tailor for production work, plus Inventory Manager if Akinyi also issues fabric.",
  },
  {
    field: "Salary / Pay (KES)",
    meaning: "Optional pay amount shown to authorized finance users. Leaving it blank does not create a zero-pay agreement.",
    example: "KES 24,000",
  },
  {
    field: "Pay Period",
    meaning: "Daily, Weekly, or Monthly. It becomes available after Salary / Pay has an amount.",
    example: "Monthly",
  },
  {
    field: "Next Pay Date",
    meaning: "Optional date when the next payment is expected. It becomes available after Salary / Pay has an amount.",
    example: "30 September 2026",
  },
];

export default function EmployeesManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual · Employees"
        title="Invite, manage, delete, and safely re-invite employees"
        description="Use Team as the authoritative list of people who belong to this business. This guide explains every invitation field, access control, incomplete setup, activity view, permanent business deletion, and credential reset."
        actionHref="/employees"
        actionLabel="Open Team"
      />

      <section id="invite" className="space-y-4 scroll-mt-24">
        <SectionHeading number={1} title="Invite an employee" description="FundiFlow creates a temporary password and invitation link for the employee." />
        <NumberedSteps steps={[
          { title: "Open Invite employee", text: "From Team, press Invite employee and enter the employee's current details." },
          { title: "Choose access deliberately", text: "Select at least one role. Add optional pay details only when the business has agreed them." },
          { title: "Create and copy the invitation", text: "Press Create invitation, then Copy invitation details. Send the email, temporary password, and link securely to that employee." },
          { title: "Employee signs in", text: "The employee uses the temporary password, accepts the invitation, and changes the password before continuing." },
        ]} />
        <FieldGuide fields={invitationFields} />
        <ExampleCard title="Kenyan workshop example">
          <p><strong>Business:</strong> Advent Fabric Services, Nairobi</p>
          <p><strong>Employee:</strong> Akinyi Otieno</p>
          <p><strong>Email:</strong> akinyi@adventfabric.co.ke</p>
          <p><strong>Role:</strong> Tailor</p>
          <p><strong>Salary / Pay:</strong> KES 24,000 monthly</p>
          <p><strong>Result:</strong> The owner copies Akinyi's new temporary password and link. Akinyi signs in and replaces that temporary password.</p>
        </ExampleCard>
      </section>

      <section id="team-page" className="space-y-4 scroll-mt-24">
        <SectionHeading number={2} title="Read the Team page" description="The list and the activity page use the same current membership record." />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["All member records", "Every current membership, whether Active or temporarily marked No longer a member."],
            ["Can access business", "Current memberships whose access is Active."],
            ["Incomplete accounts", "Invitation attempts where the login account, profile, or membership did not finish setup."],
            ["Search", "Find a current employee by name, email, or employee number."],
            ["View activity", "Open the employee profile, compensation, roles, and assigned order activity."],
            ["Invitation history", "Press Read more to see attempts. Press Read less to hide them again."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <Note><strong>History status matters.</strong> Pending can still be accepted before expiry. Accepted records show completed invitations. Revoked and Expired passwords or links cannot be used.</Note>
      </section>

      <section id="incomplete-invite" className="space-y-4 scroll-mt-24">
        <SectionHeading number={3} title="Resolve an incomplete invitation" description="Do not leave a staff member trapped between a login account and the Team list." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-emerald-700" /><h3 className="font-bold text-emerald-950">Complete invitation setup</h3></div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">Correct the name, choose the role, add optional pay, and complete setup. FundiFlow issues a new temporary password and invitation link.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-700" /><h3 className="font-bold text-rose-950">Delete incomplete account</h3></div>
            <p className="mt-2 text-sm leading-6 text-rose-900">Use the bin, read the confirmation, and delete. The unfinished login and all usable invitation attempts are removed or revoked, so the email can start again cleanly.</p>
          </div>
        </div>
      </section>

      <section id="access" className="space-y-4 scroll-mt-24">
        <SectionHeading number={4} title="Pause, restore, or delete access" description="These controls have different outcomes. Choose the one that matches the real employment decision." />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {[
              ["No longer a member", "Turns off business access but keeps the membership card so the owner can Restore access later."],
              ["Restore access", "Makes the existing membership Active again. Use this only when the same employment record should continue."],
              ["Delete", "Permanently removes the membership from this business, signs out its sessions, revokes every earlier invitation, and invalidates the old password when this was the employee's last business."],
            ].map(([title, text]) => (
              <div key={title} className="grid gap-1 px-4 py-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <Note warning><strong>Deletion is from this business.</strong> Past orders keep their historical work information. The employee disappears from the current Team list and cannot use old credentials to regain access.</Note>
      </section>

      <section id="reinvite" className="space-y-4 scroll-mt-24">
        <SectionHeading number={5} title="Re-invite a deleted employee" description="Use Invite employee again with the same email. Do not reuse anything from the previous invitation." />
        <NumberedSteps steps={[
          { title: "Create a fresh invitation", text: "Enter the same email with the employee's current name, roles, and pay details." },
          { title: "Copy only the new credentials", text: "FundiFlow generates a different temporary password and invitation link and revokes all earlier attempts." },
          { title: "Ask the employee to sign in again", text: "The old password and old links are invalid. The employee must use the newest temporary password." },
          { title: "Confirm activity opens", text: "After acceptance, the employee appears Active. Press View activity to verify the profile and assigned orders." },
        ]} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-4 text-white"><KeyRound className="h-5 w-5 text-emerald-300" /><p className="mt-3 text-sm font-bold">New password only</p><p className="mt-1 text-xs leading-5 text-slate-300">Every re-invitation replaces the previous password.</p></div>
          <div className="rounded-2xl bg-slate-950 p-4 text-white"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-3 text-sm font-bold">Old links revoked</p><p className="mt-1 text-xs leading-5 text-slate-300">Previous pending or accepted attempts are retained only as revoked history.</p></div>
          <div className="rounded-2xl bg-slate-950 p-4 text-white"><Users className="h-5 w-5 text-emerald-300" /><p className="mt-3 text-sm font-bold">One current membership</p><p className="mt-1 text-xs leading-5 text-slate-300">Only the fresh membership can become Active for this business.</p></div>
        </div>
      </section>

      <section id="owner-check" className="space-y-4 scroll-mt-24">
        <SectionHeading number={6} title="Final owner check" description="Use this checklist after a deletion or re-invitation." />
        <Checklist items={[
          "A deleted employee no longer appears in the Team grid.",
          "Past invitation records show Revoked or Expired, not Pending.",
          "The employee cannot sign in with the old temporary or personal password when this was their last business.",
          "A re-invited employee received only the newest password and link.",
          "After accepting, the employee shows Active and View activity opens the correct profile.",
          "Past assigned orders still show the historical work record.",
        ]} />
        <div className="flex flex-wrap gap-4 text-sm">
          <ProductLink href="/employees">Open Team</ProductLink>
          <ProductLink href="/employees/new">Invite an employee</ProductLink>
          <ProductLink href="/settings/role-permissions">Review role permissions</ProductLink>
        </div>
      </section>
    </div>
  );
}
