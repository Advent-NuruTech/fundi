import {
  Checklist,
  ExampleCard,
  FieldGuide,
  ManualHeader,
  Note,
  NumberedSteps,
  SectionHeading,
} from "@/modules/manual/components/manual-ui";

export default function AiAdvisorManualPage() {
  return (
    <div className="space-y-8 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual · Business Advisor"
        title="Use your private business advisor"
        description="Ask one clear question and FundiFlow privately brings in the right finance, operations, stock, sales, customer-care, production, marketing, or growth specialist. You receive one joined-up answer instead of managing several chatbots."
        actionHref="/ai"
        actionLabel="Open Business Advisor"
      />

      <section id="advisor-overview" className="scroll-mt-24 space-y-3">
        <SectionHeading number={1} title="One advisor, specialist team behind it" description="Leave the focus on Auto for everyday use. The advisor reads the wording of your question, selects up to three relevant specialists, and checks only the business information your employee role is allowed to view." />
        <Checklist items={[
          "Each business has separate conversations and business context.",
          "Finance data remains hidden when the signed-in role cannot view Finance.",
          "The answer names the specialists used when an expert review was needed.",
          "No tenant record or conversation content is added to platform growth analytics.",
        ]} />
      </section>

      <section id="advisor-controls" className="scroll-mt-24 space-y-3">
        <SectionHeading number={2} title="Every control on the advisor screen" />
        <FieldGuide fields={[
          { field: "Advisor focus", meaning: "Auto chooses the best specialist. Choose a named focus only when you want the whole conversation led by that discipline.", example: "Amina leaves Auto selected for ‘Why is cash tight even though orders are busy?’" },
          { field: "History", meaning: "Opens your private conversation list. Select a conversation to continue it, or use its pencil and bin controls to rename or delete it.", example: "Amina renames a thread ‘September school-uniform plan’." },
          { field: "New", meaning: "Starts a clean conversation without deleting previous history.", example: "After finishing a stock review, Amina starts a new chat for staff capacity." },
          { field: "Question box", required: true, meaning: "Write the decision, problem, or draft you need. Press Enter to send; use Shift+Enter for another line.", example: "‘We have 12 active orders and three are due Friday. What should we do first?’" },
          { field: "Helpful buttons", meaning: "Thumbs up or down records only an answer-quality score. It helps improve recommendations without sharing the conversation in platform analytics.", example: "Amina marks a practical cash-collection plan helpful." },
        ]} />
      </section>

      <section id="ask-well" className="scroll-mt-24 space-y-3">
        <SectionHeading number={3} title="Ask for a decision, not a long report" description="The advisor is most useful when the outcome and time period are clear." />
        <NumberedSteps steps={[
          { title: "Name the decision", text: "Ask what to prioritise, price, reorder, collect, assign, send, or test." },
          { title: "Add the time window", text: "Say today, this week, this month, or before a specific due date." },
          { title: "Ask for evidence", text: "Request the figures used, assumptions, expected impact, and confidence when the decision is important." },
          { title: "Verify before acting", text: "Check high-value financial, legal, tax, refund, and sensitive customer decisions with the responsible person or professional." },
        ]} />
      </section>

      <section id="kenyan-example" className="scroll-mt-24 space-y-3">
        <SectionHeading number={4} title="Kenyan business example" />
        <ExampleCard title="Amina Designs · Nairobi">
          <p><strong>Question:</strong> “School opening is in three weeks. Check stock, production and cash. What should I do this week without risking late orders?”</p>
          <p><strong>What happens:</strong> Auto brings in Inventory, Production, and Finance. The answer uses Amina Designs’ permitted stock levels, due dates, recorded payments, and expenses; it separates known figures from assumptions and gives the first three actions.</p>
          <p><strong>Follow-up:</strong> “Turn that into a Monday-to-Saturday checklist for my team.” The same conversation remembers the agreed priorities.</p>
        </ExampleCard>
      </section>

      <section id="privacy-limits" className="scroll-mt-24 space-y-3">
        <SectionHeading number={5} title="Privacy, accuracy, and limits" />
        <Note warning><strong>Do not enter passwords, API keys, card details, or secrets.</strong> The advisor can still be wrong or work from incomplete records. It does not guarantee profit or replace an accountant, lawyer, tax adviser, or human approval for sensitive decisions.</Note>
      </section>
    </div>
  );
}
