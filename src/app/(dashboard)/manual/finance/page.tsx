import { BarChart3, CircleDollarSign, Landmark, PiggyBank, Receipt, Wallet } from "lucide-react";

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

const expenseFields: ManualField[] = [
  {
    field: "Category",
    required: true,
    meaning: "Choose the type of business cost. Select Add custom category when none of the saved choices fits; the custom name then becomes required.",
    example: "Rent for the workshop, Utilities for electricity, or a custom category called Beading labour.",
  },
  {
    field: "Amount (KES)",
    required: true,
    meaning: "Enter the amount paid as a positive number above zero. FundiFlow treats the saved record as money leaving the business.",
    example: "KES 18,000 for September workshop rent.",
  },
  {
    field: "Date",
    meaning: "The day the business paid or incurred the cost. It starts with today and cannot be set to a future date.",
    example: "3 September 2026.",
  },
  {
    field: "What was this expense for?",
    required: true,
    meaning: "A short, specific explanation that will make sense later in the expense list, ledger, and reports.",
    example: "September rent for the Ngara workshop.",
  },
  {
    field: "Supplier / Paid To",
    meaning: "The business or person who received the payment. This is searchable from the Expenses page.",
    example: "Wanjiku Properties Ltd.",
  },
  {
    field: "Extra notes",
    meaning: "Optional supporting detail such as an invoice number, payment method, or approval note.",
    example: "Paid by M-Pesa, transaction QI3H7K2ABC; invoice RENT-0926.",
  },
];

const withdrawalFields: ManualField[] = [
  {
    field: "Category",
    required: true,
    meaning: "Choose why money left the business without being an ordinary operating expense. You can add a custom category.",
    example: "Owner Drawings for money taken by the owner, or Salary Advance for an advance to a tailor.",
  },
  {
    field: "Amount (KES)",
    required: true,
    meaning: "Enter the positive amount removed from business funds. The saved transaction is displayed as money out.",
    example: "KES 8,000.",
  },
  {
    field: "Date",
    meaning: "The day the money was taken out. It defaults to today and cannot be a future date.",
    example: "2 September 2026.",
  },
  {
    field: "Reason for withdrawal",
    required: true,
    meaning: "Explain who took the money and why so the owner can distinguish it from a supplier or operating expense.",
    example: "Owner withdrew cash for personal school fees.",
  },
  {
    field: "Extra notes",
    meaning: "Optional reference details for the withdrawal.",
    example: "Approved by owner; taken from the M-Pesa till.",
  },
];

const investmentFields: ManualField[] = [
  {
    field: "Investment Type",
    required: true,
    meaning: "Choose Equipment, Stock / Inventory, Training, Technology, Marketing, Property, Other, or add a custom type.",
    example: "Equipment for an industrial overlock machine.",
  },
  {
    field: "Amount Invested (KES)",
    required: true,
    meaning: "The positive amount committed to growing the business.",
    example: "KES 85,000 paid for the overlock machine.",
  },
  {
    field: "Date",
    meaning: "The investment date. It starts with today; choose the actual purchase or commitment date.",
    example: "20 August 2026.",
  },
  {
    field: "What is this investment?",
    required: true,
    meaning: "A clear description of the asset or growth activity being tracked.",
    example: "Bought one Jack industrial overlock machine.",
  },
  {
    field: "Expected Return (KES)",
    meaning: "An optional estimate of the money you expect this investment to return. It is a planning figure, not guaranteed income.",
    example: "KES 140,000 in additional work over twelve months.",
  },
  {
    field: "Actual Returns (KES)",
    meaning: "Money already returned by the investment. Update this as results are realised; it feeds Returns So Far and ROI.",
    example: "KES 32,000 earned so far from extra finishing work.",
  },
  {
    field: "Status",
    meaning: "Available while editing: Active means it is still running, Completed means it has finished, and Cancelled means it was stopped.",
    example: "Active while the machine is still being evaluated.",
  },
  {
    field: "Notes",
    meaning: "Optional details such as the vendor, warranty, or how the expected return was estimated.",
    example: "Bought from Industrial Area; 12-month warranty.",
  },
];

const savingsGoalFields: ManualField[] = [
  {
    field: "Goal Name",
    required: true,
    meaning: "A short name for the exact purpose of the savings pot.",
    example: "Second industrial sewing machine.",
  },
  {
    field: "Target Amount (KES)",
    required: true,
    meaning: "The positive total you want to save. Progress is measured against this amount.",
    example: "KES 120,000.",
  },
  {
    field: "Deadline",
    meaning: "An optional target completion date. New goals cannot use a past deadline.",
    example: "15 December 2026.",
  },
  {
    field: "Description",
    meaning: "Optional context for the goal and why it matters.",
    example: "Needed before the January school-uniform rush.",
  },
  {
    field: "Color",
    meaning: "Choose the colour used for the goal card and progress bar. It changes presentation only, not calculations.",
    example: "Blue for the equipment goal.",
  },
];

const savingsDepositFields: ManualField[] = [
  {
    field: "Amount to Add (KES)",
    required: true,
    meaning: "The positive amount being added to this goal now.",
    example: "KES 10,000 from this week's uniform deposits.",
  },
  {
    field: "Date",
    meaning: "The actual deposit date. It defaults to today and cannot be in the future.",
    example: "3 September 2026.",
  },
  {
    field: "Notes",
    meaning: "Optional detail explaining where this contribution came from.",
    example: "Week 1 September savings from school-uniform orders.",
  },
];

export default function FinanceManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual · Finance"
        title="Know what came in, what went out, and what remains"
        description="Finance brings customer payments, business expenses, withdrawals, investments, savings, and reports together. Record each movement in the correct place so the dashboard and profit figures remain useful."
        actionHref="/finance"
        actionLabel="Open Finance"
      />

      <Note>
        <strong>Income is automatic:</strong> money received from a customer is recorded in <ProductLink href="/payments">Payments</ProductLink> and then appears in Finance. Do not create an expense with a negative amount or use a withdrawal to represent a customer payment.
      </Note>

      <section id="finance-map" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={1}
          title="Choose the correct Finance tab"
          description="Each tab answers a different money question. Using the right one prevents double counting and misleading profit reports."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExampleCard title="Overview">
            <p>Current earnings, spending, cash flow, alerts, profit, outstanding customer balances, stock value, and recent activity.</p>
          </ExampleCard>
          <ExampleCard title="Expenses" tone="amber">
            <p>Ordinary business costs paid to run the tailoring shop, such as rent, power, transport, casual labour, or repairs.</p>
          </ExampleCard>
          <ExampleCard title="Withdrawals" tone="blue">
            <p>Money removed from the business, such as owner drawings or a salary advance. A withdrawal reduces what remains but is kept separate from operating expenses.</p>
          </ExampleCard>
          <ExampleCard title="Investments">
            <p>Money put into growth, with expected returns, actual returns, status, and ROI tracking.</p>
          </ExampleCard>
          <ExampleCard title="Savings" tone="blue">
            <p>Named goals and their deposits, target amount, deadline, progress, and remaining balance.</p>
          </ExampleCard>
          <ExampleCard title="Transactions and Reports" tone="amber">
            <p>Transactions is the unified audit ledger. Reports turns the same records into period summaries, charts, CSV files, and printable reports.</p>
          </ExampleCard>
        </div>
        <Note warning>
          <strong>Expense or withdrawal?</strong> Workshop rent paid to a landlord is an Expense. Cash taken by the owner for personal use is a Withdrawal. Record it once, in the category that describes what really happened.
        </Note>
      </section>

      <section id="overview" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={2}
          title="Read the Financial Dashboard and time views"
          description="The Overview combines records from Payments, Expenses, Withdrawals, Inventory, Orders, Purchase Orders, and payroll-related employee records."
        />
        <Checklist
          items={[
            "Today's Earnings and the Week, Month, Year, and Total Revenue cards summarise recorded customer payments for the permitted periods.",
            "Pending Payments is the unpaid balance still attached to customer orders; it is not cash already received.",
            "Net Profit subtracts expenses, withdrawals, and the included liabilities from revenue for the displayed calculation.",
            "Total Cash In shows incoming payments. Total Cash Out includes expenses, withdrawals, and inventory-purchase cash outflow.",
            "Profit Margin is net profit divided by revenue. Expense Ratio compares operating expenses with revenue.",
            "Low Stock Items and Overdue Orders are operational warnings that may explain a future cash need or delayed collection.",
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ExampleCard title="Overview tab">
            <p>Use the 14-day Earnings vs Spending and Daily Profit charts to spot recent movement. Expenses by Category explains where costs went. Profit & Loss and Business Health are owner-level insights. Recent Activity shows the latest payments, expenses, and withdrawals.</p>
          </ExampleCard>
          <ExampleCard title="This Week, This Month, This Year" tone="blue">
            <p>Use the arrow controls to move through permitted history. Week shows daily earnings, spending, and profit; Month groups the calendar into weeks; Year compares all twelve months. Future dates do not add activity.</p>
          </ExampleCard>
        </div>
        <ExampleCard title="Nairobi tailoring example" tone="emerald">
          <p>If September customer payments total <strong>KES 320,000</strong>, expenses are <strong>KES 120,000</strong>, and withdrawals are <strong>KES 30,000</strong>, the money cards help the owner see the difference between sales collected, shop costs, and cash taken out. An unpaid KES 45,000 school-uniform order remains under Pending Payments until its payment is recorded.</p>
        </ExampleCard>
      </section>

      <section id="expenses" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={3}
          title="Record and maintain a business expense"
          description="Use Expenses for money spent operating the business. The list can be searched by description, category, or supplier and filtered by category."
        />
        <NumberedSteps
          steps={[
            { title: "Open Expenses and select Add Expense", text: "Choose an existing category or Add custom category. Use a specific custom name that can be reused consistently." },
            { title: "Enter the amount, date, and reason", text: "The amount must be above zero. The reason is required; supplier and notes add useful evidence." },
            { title: "Save and verify", text: "The new expense appears in the table, totals, category chart, transaction ledger, and reports." },
            { title: "Correct carefully", text: "Use the pencil action to edit. The bin action permanently deletes after confirmation, so delete only a duplicate or genuinely incorrect record." },
          ]}
        />
        <FieldGuide fields={expenseFields} />
        <ExampleCard title="Expense example" tone="amber">
          <p>Record <strong>KES 6,450</strong> under <strong>Utilities</strong> on 3 September 2026, with the description <strong>August electricity bill for Ngara workshop</strong>, paid to <strong>Kenya Power</strong>, and add the M-Pesa reference in Extra notes.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/finance/expenses">Open Expenses</ProductLink></p>
      </section>

      <section id="withdrawals" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={4}
          title="Record money withdrawn from the business"
          description="Withdrawals keeps owner drawings and similar removals visible without mixing them into ordinary operating costs."
        />
        <NumberedSteps
          steps={[
            { title: "Select Record Withdrawal", text: "Choose Owner Drawings, Salary Advance, Business Expenses, Tax, Emergency, Other, or a clear custom category." },
            { title: "Explain the movement", text: "Enter a positive amount, the actual date, and a required reason. Add notes where approval or payment-channel detail matters." },
            { title: "Review and maintain", text: "Search by reason, category, or person; filter by category; use the pencil to edit or the bin to delete after confirmation." },
          ]}
        />
        <FieldGuide fields={withdrawalFields} />
        <ExampleCard title="Withdrawal example" tone="blue">
          <p>The owner takes <strong>KES 8,000</strong> from the business till for personal school fees. Record it as <strong>Owner Drawings</strong>, not Rent and not Salary Advance. The record shows who made the withdrawal and reduces the finance net figure.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/finance/withdrawals">Open Withdrawals</ProductLink></p>
      </section>

      <section id="investments" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={5}
          title="Track an investment and its return"
          description="Investments records growth spending separately and compares actual returns with the money invested."
        />
        <NumberedSteps
          steps={[
            { title: "Select Record Investment", text: "Choose the closest investment type, enter the amount and date, and describe exactly what the business acquired or funded." },
            { title: "Set an expected return", text: "Add a realistic estimate when you have one. Notes should explain the estimate, supplier, warranty, or growth plan." },
            { title: "Update actual performance", text: "Use Edit as returns are realised. Enter Actual Returns and change Status to Completed when the investment has finished, or Cancelled if it stopped." },
            { title: "Read ROI with context", text: "Returns So Far and ROI use the actual-return values you recorded. A percentage is only as reliable as those updates." },
          ]}
        />
        <FieldGuide fields={investmentFields} />
        <Note>
          For a new investment, save the core record first and use <strong>Edit</strong> when recording realised Actual Returns or changing its Status. This keeps the starting investment separate from later performance updates.
        </Note>
        <p className="text-sm"><ProductLink href="/finance/investments">Open Investments</ProductLink></p>
      </section>

      <section id="savings" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={6}
          title="Create a savings goal and add deposits"
          description="Savings separates a target from the individual contributions made toward it."
        />
        <NumberedSteps
          steps={[
            { title: "Select New Goal", text: "Name the purpose, enter a target, optionally add a future deadline and description, then choose a colour." },
            { title: "Select Add on the goal card", text: "Enter the amount contributed, its date, and an optional note. The card recalculates saved, percentage complete, and amount to go." },
            { title: "Review deposit history", text: "Expand View deposit history on the goal card to see each amount, note, and date." },
            { title: "Edit or delete with care", text: "Editing changes the goal details. Deleting a goal also deletes all of its deposits after confirmation and cannot be undone." },
          ]}
        />
        <h3 className="text-base font-bold text-slate-950">Savings goal fields</h3>
        <FieldGuide fields={savingsGoalFields} />
        <h3 className="text-base font-bold text-slate-950">Deposit fields</h3>
        <FieldGuide fields={savingsDepositFields} />
        <ExampleCard title="Savings example">
          <p>Create <strong>Second industrial sewing machine</strong> with a target of <strong>KES 120,000</strong> due 15 December 2026. Add KES 10,000 each week with a dated note. The progress card shows the total saved, percentage complete, and amount remaining.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/finance/savings">Open Savings</ProductLink></p>
      </section>

      <section id="transactions" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={7}
          title="Use the Transaction Ledger as the audit view"
          description="Transactions brings supported money movements into one read-only list; create or correct a record on its source page."
        />
        <Checklist
          items={[
            "Search checks the description, reference, and linked customer, order, supplier, or other entity name.",
            "All Types can be narrowed to Payment Received, Expense, Withdrawal, Inventory Purchase, Refund, or Adjustment.",
            "All Time can be narrowed to Today, This Week, This Month, or This Year.",
            "Cash In, Cash Out, and Net Flow recalculate from the filtered rows, so clear filters before reading an all-time total.",
            "A green plus is money in and a red minus is money out. Status shows whether the source transaction is completed, pending, or failed.",
            "Reference and Linked To help trace a row back to the business record that created it.",
          ]}
        />
        <ExampleCard title="Audit example" tone="blue">
          <p>To check September rent, select <strong>Expense</strong> and <strong>This Month</strong>, then search <strong>Ngara workshop</strong> or the supplier name. If the record is wrong, edit it in Expenses rather than trying to change the ledger row.</p>
        </ExampleCard>
        <p className="text-sm"><ProductLink href="/finance/transactions">Open Transactions</ProductLink></p>
      </section>

      <section id="reports" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={8}
          title="Read, export, and print Financial Reports"
          description="Reports summarises the selected current period and compares the main figures with the previous matching period."
        />
        <NumberedSteps
          steps={[
            { title: "Choose a period", text: "Select Daily, Weekly, Monthly, or Yearly. The date line below Financial Reports shows the current range used." },
            { title: "Read the summary", text: "Revenue, Expenses, Net Profit, and Profit Margin show the current result. Trend arrows compare revenue, expenses, and profit with the previous period." },
            { title: "Check the detail", text: "Profit & Loss separates revenue, expenses, and withdrawals. The report also includes order and payment counts, daily charts, top earning services, and expense categories when data exists." },
            { title: "Export or print", text: "CSV downloads the summary metrics for the displayed range. Print opens the browser print flow for a paper copy or PDF." },
          ]}
        />
        <Note warning>
          CSV exports the report summary, not every transaction row. Use the Transaction Ledger to investigate individual entries. Reports are for business review and do not replace advice from a qualified accountant or KRA tax records.
        </Note>
        <p className="text-sm"><ProductLink href="/finance/reports">Open Financial Reports</ProductLink></p>
      </section>

      <section id="permissions" className="space-y-4 scroll-mt-24">
        <SectionHeading
          number={9}
          title="Understand Finance access"
          description="What a staff member sees depends on their role and the Finance permissions granted by the owner."
        />
        <Checklist
          items={[
            "The owner and approved co-owner access can see owner-level Finance information.",
            "Managers may be limited to today's Finance data unless Week, Month, Year, total-revenue, profit-margin, inventory-value, or full-dashboard permissions are granted.",
            "Investments, Savings, and Financial Reports are owner-level areas unless their specific visibility permission is enabled.",
            "Hidden figures and missing tabs usually indicate access settings, not missing records.",
            "Only grant financial visibility needed for the employee's real job responsibilities.",
          ]}
        />
        <p className="text-sm"><ProductLink href="/settings/role-permissions">Review role permissions</ProductLink></p>
      </section>

      <section id="finance-routine" className="scroll-mt-24 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-lg font-bold text-emerald-950">A practical weekly finance routine</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">Record customer receipts in Payments every day. Record operating costs in Expenses and money taken out in Withdrawals. On Friday, compare the Transaction Ledger with M-Pesa, bank, and cash records; update savings and investment returns; then review the weekly dashboard and Financial Report with the owner.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: CircleDollarSign, label: "Record payments", href: "/payments" },
                { icon: Receipt, label: "Check expenses", href: "/finance/expenses" },
                { icon: Wallet, label: "Check withdrawals", href: "/finance/withdrawals" },
                { icon: PiggyBank, label: "Update savings", href: "/finance/savings" },
                { icon: BarChart3, label: "Review reports", href: "/finance/reports" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <ProductLink key={item.href} href={item.href}>
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
