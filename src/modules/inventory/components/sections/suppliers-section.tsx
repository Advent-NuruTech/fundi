"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/services/firestore.service";

import { useBusinessContext } from "@/modules/shared/use-business-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { Supplier } from "@/types/domain";

interface SupplierForm {
  name: string;
  phone: string;
  contactPerson: string;
  notes: string;
}

export function SuppliersSection({
  suppliers,
}: {
  suppliers: Supplier[];
}) {
  const { businessId } = useBusinessContext();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<SupplierForm>();

  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null
  );

  const [showForm, setShowForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!editingSupplierId) {
      reset({
        name: "",
        phone: "",
        contactPerson: "",
        notes: "",
      });
    }
  }, [editingSupplierId, reset]);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      return (
        supplier.name?.toLowerCase().includes(query) ||
        supplier.phone?.toLowerCase().includes(query) ||
        supplier.contactPerson?.toLowerCase().includes(query) ||
        supplier.notes?.toLowerCase().includes(query)
      );
    });
  }, [suppliers, searchQuery]);

  const startEdit = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);

    setShowForm(true);

    setValue("name", supplier.name || "");
    setValue("phone", supplier.phone || "");
    setValue("contactPerson", supplier.contactPerson || "");
    setValue("notes", supplier.notes || "");
  };

  const cancelEdit = () => {
    setEditingSupplierId(null);

    reset({
      name: "",
      phone: "",
      contactPerson: "",
      notes: "",
    });

    setShowForm(false);
  };

  const saveSupplier = handleSubmit(async (values) => {
    try {
      if (editingSupplierId) {
        await updateSupplier(businessId, editingSupplierId, {
          ...values,
        });

        toast.success("Supplier updated");
      } else {
        await createSupplier(businessId, {
          ...values,
          businessId,
        });

        toast.success("Supplier added");
      }

      cancelEdit();
    } catch (error) {
      console.error(error);

      toast.error(
        editingSupplierId
          ? "Could not update supplier"
          : "Could not save supplier"
      );
    }
  });

  const handleDeleteSupplier = async (supplierId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmed) return;

    try {
      await deleteSupplier(businessId, supplierId);

      if (editingSupplierId === supplierId) {
        cancelEdit();
      }

      toast.success("Supplier deleted");
    } catch (error) {
      console.error(error);

      toast.error("Could not delete supplier");
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold">
              Suppliers
            </CardTitle>

            <Badge
              variant="default"
              className="rounded-full px-3 py-1"
            >
              {suppliers.length} Supplier
              {suppliers.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[260px]"
            />

            <Button
              type="button"
              onClick={() => {
                if (showForm && editingSupplierId) {
                  cancelEdit();
                } else {
                  setShowForm((prev) => !prev);
                }
              }}
              className="whitespace-nowrap"
            >
              {showForm
                ? editingSupplierId
                  ? "Close Edit"
                  : "Close Form"
                : "Add Supplier"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showForm && (
          <form
            onSubmit={saveSupplier}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Supplier name"
                {...register("name", { required: true })}
              />

              <Input
                placeholder="Phone number"
                {...register("phone", { required: true })}
              />

              <Input
                placeholder="Contact person"
                {...register("contactPerson")}
              />

              <Input
                placeholder="Notes"
                {...register("notes")}
              />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {editingSupplierId
                  ? "Update Supplier"
                  : "Save Supplier"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {filteredSuppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "No suppliers found."
                : "No suppliers yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300"
              >
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {supplier.name}
                      </h3>

                      <Badge variant="default">
                        {supplier.phone}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-slate-500">
                      {supplier.contactPerson && (
                        <p>
                          <span className="font-medium text-slate-700">
                            Contact:
                          </span>{" "}
                          {supplier.contactPerson}
                        </p>
                      )}

                      {supplier.notes && (
                        <p className="line-clamp-3">
                          {supplier.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(supplier)}
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        handleDeleteSupplier(supplier.id)
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
