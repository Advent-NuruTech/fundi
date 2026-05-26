"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { employees } from "@/features/employees/data/employees.mock";

export function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(employees[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      router.push("/customers");
    }, 500);
  };

  const selectedEmployee = employees.find((e) => e.id === assignedEmployeeId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">New Customer</h1>
          <p className="text-sm text-gray-500">
            Add a customer to your business
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border bg-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Grace Wanjiku"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. 0712345678"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. grace@email.com"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned Employee</label>
            <select
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            >
              {employees.filter((e) => e.isActive).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeNumber}) - {emp.role}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <p className="text-xs text-gray-400">
                Customer will be attached to {selectedEmployee.name}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any initial notes about this customer..."
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-black py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {saving ? "Saving..." : "Add Customer"}
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
