import {
  Checklist,
  ExampleCard,
  FieldGuide,
  ManualHeader,
  Note,
  NumberedSteps,
  ProductLink,
  SectionHeading,
} from "@/modules/manual/components/manual-ui";

export default function GlobalSellManualPage() {
  return (
    <div className="space-y-6 pb-10">
      <ManualHeader
        eyebrow="Global Sell guide"
        title="Run your own online store"
        description="Global Sell gives your business a public, shareable shop. Customers who open your shop see your brand and can search only the products and services you have published."
        actionHref="/sell"
        actionLabel="Open Global Sell"
      />

      <Note>
        Your public shop is separate from the seller workspace. Use the <strong>View My Store</strong> button in Global Sell to check the exact page customers will see, then copy or share that address from Store Settings.
      </Note>

      <section className="space-y-4">
        <SectionHeading
          number={1}
          title="Set up the public shop"
          description="Open Global Sell, then Store Settings. Save these details before sharing your store address."
        />
        <FieldGuide
          fields={[
            { field: "Store Name", required: true, meaning: "The business name customers see in the shop header and footer.", example: "Amani Bridal Studio" },
            { field: "Store Web Address", required: true, meaning: "The unique ending of your public shop link. It must use lowercase letters, numbers, and single hyphens.", example: "shop.fundiflow.co.ke/amani-bridal" },
            { field: "Store Description", meaning: "A short introduction displayed below your shop name.", example: "Custom bridal gowns, alterations and occasion wear in Nairobi." },
            { field: "Location", meaning: "Where customers can find or collect from your business.", example: "Westlands, Nairobi" },
            { field: "Profile Image", meaning: "Your square shop image, shown beside the store name.", example: "A close-up of Amani Bridal Studio's logo." },
            { field: "Cover Banner", meaning: "A wide image across the top of the public shop.", example: "A finished bridal gown in the studio." },
            { field: "Contact Phone and Email", meaning: "Optional contact details customers can use from the public shop.", example: "0712 345 678 and hello@amanibridal.co.ke" },
            { field: "Notification Phone Number", meaning: "The Kenyan-format number that receives an SMS when a customer places an online order.", example: "254712345678" },
          ]}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={2}
          title="Publish what customers can buy or enquire about"
          description="Open My Products and add each ready-made item, tailoring service, package, or wholesale listing. A listing is visible in the public shop only when its status is Published."
        />
        <NumberedSteps
          steps={[
            { title: "Add the listing", text: "Use Add Product. Give the item or service a clear name, price, description, photos, stock settings and any variants such as size or colour." },
            { title: "Choose the right sales channel", text: "Use retail for individual customers, wholesale for bulk buyers, or both when the same listing supports each kind of sale." },
            { title: "Publish it", text: "Change the listing status to Published. Draft and archived listings remain hidden from the public shop." },
            { title: "Check the public result", text: "From the Global Sell overview, select View My Store and open the listing as a customer would." },
          ]}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={3}
          title="Share and shop from your personal storefront"
          description="The Global Sell overview button opens your own public web address, not the all-seller marketplace. Your shop has its own name, imagery, contact details, basket and catalogue search."
        />
        <ExampleCard title="Kenyan business example">
          <p>After publishing “Bridal gown fitting” and “Ready-made kitenge dress”, Amani Bridal Studio shares <strong>shop.fundiflow.co.ke/amani-bridal</strong> on WhatsApp and Instagram.</p>
          <p>When a customer searches “kitenge” on that page, FundiFlow searches only Amani Bridal Studio&apos;s published listings. It never mixes in another tailor&apos;s products.</p>
        </ExampleCard>
        <Checklist items={[
          "Use View My Store to open the public shop in a new tab.",
          "Use the search bar on the public shop to find only that store's listings.",
          "Use the Share button in Store Settings to send the current public address.",
          "Keep Store Settings up to date when your contact details, location or branding changes.",
        ]} />
      </section>

      <section className="space-y-3">
        <SectionHeading number={4} title="Manage online orders" description="Incoming Orders contains purchases from the public shop. Confirm availability, agree delivery and payment with the buyer, then keep the order status current." />
        <p className="text-sm leading-6 text-slate-600">Use My Purchases for orders your own business has placed with other sellers. This is different from Incoming Orders, which contains orders customers made from your store.</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <ProductLink href="/sell">Open Global Sell overview</ProductLink>
          <ProductLink href="/sell/products">Manage products</ProductLink>
          <ProductLink href="/sell/settings">Open Store Settings</ProductLink>
          <ProductLink href="/sell/orders">Open Incoming Orders</ProductLink>
        </div>
      </section>
    </div>
  );
}
