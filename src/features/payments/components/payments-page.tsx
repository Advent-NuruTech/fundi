"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Search,
  Smartphone,
  Landmark,
} from "lucide-react";
import { customers as initialCustomers } from "@/features/customers/data/customers.mock";

export function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("all");

  const allPayments = useMemo(() => {
    const payments: {
      id: string;
      customerName: string;
      customerId: string;
      date: string;
      amount: number;
      method: string;
    }[] = [];

    initialCustomers.forEach((c) => {
      c.payments.forEach((p) => {
        payments.push({
          id: p.id,
          customerName: c.name,
          customerId: c.id,
          date: p.date,
          amount: p.amount,
          method: (p as any).method || "cash",
        });
      });
    });

    return payments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, []);

  const filtered = useMemo(() => {
    return allPayments.filter((p) => {
      const matchesSearch = p.customerName
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesMethod =
        filterMethod === "all" || p.method === filterMethod;
      return matchesSearch && matchesMethod;
    });
  }, [search, filterMethod, allPayments]);

  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = initialCustomers.reduce(
    (sum, c) => sum + c.balance,
    0
  );

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "mpesa":
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case "bank":
        return <Landmark className="h-4 w-4 text-blue-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-500">
          Track deposits, balances, and payment history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            KES {totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <p className="text-sm text-gray-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            KES {totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="mt-2 text-2xl font-bold">
            {allPayments.length}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name..."
            className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-black"
          />
        </div>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="h-14 rounded-2xl border px-4 text-sm outline-none focus:border-black"
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="bank">Bank</option>
        </select>
      </div>

      <div className="rounded-3xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium text-gray-500">Date</th>
                <th className="p-4 font-medium text-gray-500">Customer</th>
                <th className="p-4 font-medium text-gray-500">Method</th>
                <th className="p-4 font-medium text-gray-500">Reference</th>
                <th className="p-4 text-right font-medium text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-0 hover:bg-neutral-50"
                >
                  <td className="p-4">{payment.date}</td>
                  <td className="p-4 font-medium">{payment.customerName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getMethodIcon(payment.method)}
                      <span className="capitalize">{payment.method}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">
                    {(payment as any).reference || "—"}
                  </td>
                  <td className="p-4 text-right font-semibold">
                    KES {payment.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-500">
            <CreditCard className="mb-4 h-12 w-12" />
            <p className="font-semibold">No payments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
