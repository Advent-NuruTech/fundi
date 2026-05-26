"use client";

const reservations = [
  {
    id: "RES-001",
    customer: "John Kamau",
    material: "Italian Wool",
    quantity: "3.2m",
    order: "ORD-1001",
    status: "Reserved",
  },

  {
    id: "RES-002",
    customer: "Mary Achieng",
    material: "Premium Cotton",
    quantity: "4.5m",
    order: "ORD-1002",
    status: "Cutting",
  },
];

export function FabricReservationsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Fabric Reservations
          </h1>

          <p className="text-gray-500">
            Reserved inventory for tailoring
          </p>
        </div>

        <button className="rounded-2xl bg-black px-5 py-3 text-white">
          New Reservation
        </button>
      </div>

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="rounded-3xl border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {reservation.customer}
                </h2>

                <p className="text-sm text-gray-500">
                  {reservation.order}
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                {reservation.status}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Info
                label="Material"
                value={reservation.material}
              />

              <Info
                label="Reserved"
                value={reservation.quantity}
              />

              <Info
                label="Reservation ID"
                value={reservation.id}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: any) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="font-semibold">
        {value}
      </p>
    </div>
  );
}