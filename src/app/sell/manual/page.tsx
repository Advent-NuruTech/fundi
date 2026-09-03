import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronRight, Images, Lightbulb, PackagePlus, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  ["Open Add Product", "In Global Sell, choose My Products, then Add Product."],
  ["Name the item", "Use the name a customer would search for. Example: Nairobi School Skirt."],
  ["Add price and stock", "Enter one regular price and the number you have ready to sell."],
  ["Add photos", "Upload photos from your phone or paste a Cloudinary or Unsplash image link. Choose one Main photo."],
  ["Add choices only if needed", "Use variants for the same item in different sizes, colours or materials."],
  ["Publish", "Choose Published and Create Product. Draft is saved but no customer can see it."],
] as const;

function ExampleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{title}</p>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </div>
  );
}

export default function FundiFlowManualPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex justify-end">
        <Link href="/manual" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
          <BookOpen className="h-4 w-4" /> Open the full FundiFlow Manual
        </Link>
      </div>
      <section className="rounded-3xl bg-slate-900 px-5 py-7 text-white sm:px-8">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-500 p-2.5"><Sparkles className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Global Sell Guide</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Add a Global Sell product without guessing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">This short guide is only for adding a new product. Follow it from top to bottom, like filling in a simple school form.</p>
          </div>
        </div>
        <Link href="/sell/products/new" className="mt-5 inline-flex"><Button className="gap-2 bg-emerald-500 hover:bg-emerald-400"><PackagePlus className="h-4 w-4" /> Start a new product <ChevronRight className="h-4 w-4" /></Button></Link>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div><h2 className="font-bold text-slate-900">One important idea</h2><p className="mt-1 text-sm leading-6 text-slate-700"><strong>A product</strong> is the thing you sell. <strong>A variant</strong> is a choice of that same thing. A black T-shirt and a white T-shirt are variants. A T-shirt and a pair of trousers are two different products.</p></div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">The six simple steps</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {steps.map(([title, text], index) => <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{index + 1}</span><div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{text}</p></div></div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Copy this first example</h2>
        <p className="mt-1 text-sm text-slate-600">This product has no variants. It is the easiest way to start.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ExampleBox title="Basic information"><p><strong>Name:</strong> Navy office dress</p><p><strong>Description:</strong> Smart navy dress, knee length, made with stretch fabric.</p><p><strong>Category:</strong> Dresses</p></ExampleBox>
          <ExampleBox title="Price and stock"><p><strong>Base price:</strong> KES 3,500</p><p><strong>Stock quantity:</strong> 5</p><p><strong>Sales channel:</strong> Retail</p></ExampleBox>
          <ExampleBox title="Pictures"><p>Add 2 clear photos: front view and back view. Mark the front view as <strong>Main</strong>.</p></ExampleBox>
          <ExampleBox title="Publishing"><p>Choose <strong>Published</strong>, then press <strong>Create Product</strong>.</p></ExampleBox>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">How to use variants</h2>
        <p className="mt-1 text-sm text-slate-600">Skip this section when every item is exactly the same. If customers need a choice, use these examples.</p>
        <div className="mt-4 space-y-4">
          <ExampleBox title="Example A — sizes only"><p><strong>Product:</strong> Plain black T-shirt</p><p>Under <strong>Variants</strong>, select <strong>Size</strong>. In the values box type: <strong>S, M, L</strong>. Press Add.</p><p>FundiFlow makes three choices: S, M and L. Enter the stock for each one, for example 4, 6 and 3.</p></ExampleBox>
          <ExampleBox title="Example B — size and colour"><p><strong>Product:</strong> School sweater</p><p>First add <strong>Size: 28, 30</strong>. Then add <strong>Color: Navy, Maroon</strong>.</p><p>FundiFlow makes four choices: 28/Navy, 28/Maroon, 30/Navy and 30/Maroon. Fill in stock and price for each line.</p></ExampleBox>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><strong>Before adding another option:</strong> Check the number of choices you are making. Two sizes × two colours = four variants. Add a new option before you enter stock, price or photos so you do not need to fill the same details again.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2"><Images className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold text-slate-900">Pictures for each variant</h2></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>1. Open the choice</strong><p className="mt-1">Press the small arrow beside a variant, such as “M / Navy”.</p></div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>2. Add pictures</strong><p className="mt-1">Paste an approved image link or use Upload to choose photos from your device.</p></div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>3. Choose Main</strong><p className="mt-1">You may add up to <strong>3 pictures per variant</strong>. Press Main on the best one.</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <div className="flex gap-3"><ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><h2 className="font-bold text-slate-900">What customers will see</h2><p className="mt-1 text-sm leading-6 text-slate-700">After you publish, customers see the product name, main picture, price and stock status in Global Sell. On the product page they choose a size, colour or other option. When they choose an option, its stock, price and Main picture are used for their order. All product and variant pictures are available in the photo gallery.</p></div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Before you press Create Product</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {["The name tells customers exactly what the item is.", "The price is correct in KES.", "Stock is entered for every variant, or the product itself if there are no variants.", "Each variant has no more than 3 pictures and the best photo is Main.", "Status is Published if you want customers to see it."].map((item) => <p key={item} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</p>)}
        </div>
      </section>
    </div>
  );
}
