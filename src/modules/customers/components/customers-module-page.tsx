"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer } from "@/types/domain";
import { customerSchema, type CustomerValues } from "@/schemas/customer.schema";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { createCustomer, listenCustomers } from "@/services/firestore.service";
import { DataTable } from "@/modules/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKes } from "@/lib/utils";

export function CustomersModulePage() {
  const { businessId, user, ready } = useBusinessContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (!ready) {
      return;
    }
    return listenCustomers(businessId, setCustomers);
  }, [businessId, ready]);

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        header: "Customer",
        cell: ({ row }) => (
          <Link className="font-medium text-emerald-700" href={`/customers/${row.original.id}`}>
            {row.original.fullName}
          </Link>
        ),
      },
      {
        header: "Phone",
        cell: ({ row }) => row.original.phone,
      },
      {
        header: "Outstanding",
        cell: ({ row }) => formatKes(row.original.outstandingBalance ?? 0),
      },
    ],
    []
  );

  const onSubmit = async (values: CustomerValues) => {
    if (!user) {
      return;
    }
    const optimisticId = `tmp-${Date.now()}`;
    const optimisticCustomer: Customer = {
      id: optimisticId,
      businessId,
      fullName: values.fullName,
      phone: values.phone,
      email: values.email || undefined,
      preferences: values.preferences,
      notes: values.notes,
      measurements: {
        bust: values.bust,
        waist: values.waist,
        hips: values.hips,
        shoulder: values.shoulder,
        sleeve: values.sleeve,
        inseam: values.inseam,
        length: values.length,
      },
      outstandingBalance: 0,
      createdAt: new Date() as unknown as Customer["createdAt"],
      updatedAt: new Date() as unknown as Customer["updatedAt"],
    };
    setSavingCustomer(true);
    setCustomers((prev) => [optimisticCustomer, ...prev]);
    try {
      await createCustomer(businessId, {
        businessId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        preferences: values.preferences,
        notes: values.notes,
        measurements: {
          bust: values.bust,
          waist: values.waist,
          hips: values.hips,
          shoulder: values.shoulder,
          sleeve: values.sleeve,
          inseam: values.inseam,
          length: values.length,
        },
      });
      toast.success("Customer saved");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save customer");
      setCustomers((prev) => prev.filter((entry) => entry.id !== optimisticId));
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={customers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add Customer + Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label>Full name</Label>
                <Input {...register("fullName")} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register("phone")} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Bust" type="number" {...register("bust")} />
                <Input placeholder="Waist" type="number" {...register("waist")} />
                <Input placeholder="Hips" type="number" {...register("hips")} />
                <Input placeholder="Sleeve" type="number" {...register("sleeve")} />
              </div>
              <div>
                <Label>Preferences</Label>
                <Textarea {...register("preferences")} />
              </div>
              <Button className="w-full" type="submit" disabled={formState.isSubmitting || savingCustomer}>
                {formState.isSubmitting || savingCustomer ? "Saving..." : "Save customer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
