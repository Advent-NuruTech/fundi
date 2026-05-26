import Image from "next/image";

export function MaterialCard({ material }: any) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative h-64 w-full">
        <Image
          src={material.image}
          alt={material.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {material.name}
            </h2>

            <p className="text-sm text-gray-500">
              {material.id}
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {material.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Width</p>
            <p className="font-medium">{material.width}</p>
          </div>

          <div>
            <p className="text-gray-500">GSM</p>
            <p className="font-medium">{material.gsm}</p>
          </div>

          <div>
            <p className="text-gray-500">Supplier</p>
            <p className="font-medium">
              {material.supplier}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Stock</p>
            <p className="font-medium">
              {material.availableStock}m
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-500">
            Available Colors
          </p>

          <div className="flex gap-2">
            {material.colors.map((color: any) => (
              <div
                key={color.name}
                className="h-8 w-8 rounded-full border"
                style={{
                  backgroundColor: color.hex,
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-500">
            Sizes
          </p>

          <div className="flex flex-wrap gap-2">
            {material.sizes.map((size: string) => (
              <span
                key={size}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs"
              >
                {size}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm text-gray-500">
              Selling Price
            </p>

            <p className="text-lg font-bold">
              KES {material.sellingPrice}/m
            </p>
          </div>

          <span className="rounded-xl bg-black px-4 py-2 text-white cursor-pointer hover:bg-gray-800 transition-colors">
            View Details
          </span>
        </div>
      </div>
    </div>
  );
}