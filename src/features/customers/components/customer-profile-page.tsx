"use client";

import { customers } from "../data/customers.mock";

export function CustomerProfilePage() {
  const customer = customers[0]; // replace with route param later

  return (
    <div className="space-y-6 p-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">
          {customer.name}
        </h1>
        <p className="text-gray-500">
          {customer.phone}
        </p>
      </div>

      {/* MEASUREMENTS */}
      <Section title="Measurements">
        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(customer.measurements).map(([key, value]) => (
            <div key={key} className="border rounded-2xl p-4">
              <p className="text-gray-500 text-sm">{key}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ORDERS */}
      <Section title="Orders">

        <div className="space-y-6">

          {customer.orders.map((order: any) => (
            <div
              key={order.id}
              className="rounded-3xl border bg-white p-5 space-y-4"
            >

              {/* IMAGES */}
              <div className="grid grid-cols-3 gap-2">
                {order.images?.map((img: string) => (
                  <img
                    key={img}
                    src={img}
                    className="h-24 w-full object-cover rounded-xl"
                  />
                ))}
              </div>

              {/* INFO */}
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{order.type}</p>
                  <p className="text-sm text-gray-500">
                    Employee: {order.employee}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
                  {order.status}
                </span>
              </div>

              {/* MONEY */}
              <div className="grid grid-cols-3 text-sm">
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold">KES {order.total}</p>
                </div>

                <div>
                  <p className="text-gray-500">Paid</p>
                  <p className="font-bold text-green-600">
                    KES {order.paid}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Balance</p>
                  <p className="font-bold text-red-600">
                    KES {order.balance}
                  </p>
                </div>
              </div>

              {/* PROGRESS */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{order.progress}%</span>
                </div>

                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-black rounded-full"
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
              </div>

              {/* COLLECTION */}
              <p className="text-sm text-gray-500">
                Collection: {order.collectionDate}
              </p>

            </div>
          ))}

        </div>

      </Section>

      {/* PAYMENTS */}
      <Section title="Payments">
        <div className="space-y-3">
          {customer.payments.map((p: any) => (
            <div
              key={p.id}
              className="flex justify-between border rounded-2xl p-4"
            >
              <span>{p.date}</span>
              <span className="font-bold">KES {p.amount}</span>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

/* HELPERS */

function Section({ title, children }: any) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}