"use client";

export function BarcodeScannerPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Barcode Scanner
        </h1>

        <p className="text-gray-500">
          Scan fabric rolls and inventory
        </p>
      </div>

      <div className="rounded-3xl border bg-white p-10">
        <div className="mx-auto flex h-[400px] max-w-xl items-center justify-center rounded-3xl border-4 border-dashed">
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              Camera Scanner Placeholder
            </h2>

            <p className="mt-3 text-gray-500">
              Future barcode + QR scanning support
            </p>

            <button className="mt-6 rounded-2xl bg-black px-5 py-3 text-white">
              Start Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}