"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { customers as initialCustomers } from "@/features/customers/data/customers.mock";
import { employees } from "@/features/employees/data/employees.mock";
import type { WorkflowStage } from "@/types";

const STAGES: WorkflowStage[] = [
  "cutting",
  "stitching",
  "fitting",
  "finishing",
  "finished",
  "delivered",
];

interface GarmentInput {
  name: string;
  quantity: number;
  notes: string;
}

export function NewOrderPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomers[0]?.id || "");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [deposit, setDeposit] = useState(0);
  const [stage, setStage] = useState<WorkflowStage>("cutting");
  const [garments, setGarments] = useState<GarmentInput[]>([
    { name: "", quantity: 1, notes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const selectedCustomer = initialCustomers.find((c) => c.id === customerId);
  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const addGarment = () => {
    setGarments([...garments, { name: "", quantity: 1, notes: "" }]);
  };

  const removeGarment = (index: number) => {
    setGarments(garments.filter((_, i) => i !== index));
  };

  const updateGarment = (
    index: number,
    field: keyof GarmentInput,
    value: string | number
  ) => {
    const updated = [...garments];
    updated[index] = { ...updated[index], [field]: value };
    setGarments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      router.push("/orders");
    }, 500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">New Order</h1>
          <p className="text-sm text-gray-500">
            Create a tailoring order
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="mb-4 font-bold">Customer & Assignment</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
              >
                {initialCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <p className="text-xs text-gray-400">
                  Balance: KES {selectedCustomer.balance}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
              >
                {employees
                  .filter((e) => e.isActive && e.role !== "manager")
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeNumber}) - {emp.role}
                    </option>
                  ))}
              </select>
              {selectedEmployee && (
                <p className="text-xs text-gray-400">
                  Order tracked under {selectedEmployee.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Starting Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as WorkflowStage)}
                className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deposit (KES)</label>
              <input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                min={0}
                className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Garments</h2>
            <button
              type="button"
              onClick={addGarment}
              className="flex items-center gap-1 rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium transition hover:bg-neutral-200"
            >
              <Plus className="h-4 w-4" />
              Add Garment
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {garments.map((garment, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl border p-4"
              >
                <div className="flex-1 space-y-2">
                  <input
                    value={garment.name}
                    onChange={(e) =>
                      updateGarment(index, "name", e.target.value)
                    }
                    placeholder="Garment type (e.g. Ankara Dress)"
                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <div className="w-24 space-y-2">
                  <input
                    type="number"
                    value={garment.quantity}
                    onChange={(e) =>
                      updateGarment(index, "quantity", Number(e.target.value))
                    }
                    min={1}
                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGarment(index)}
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-2xl bg-black py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Creating Order..." : "Create Order"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border px-6 py-3 font-medium transition hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
