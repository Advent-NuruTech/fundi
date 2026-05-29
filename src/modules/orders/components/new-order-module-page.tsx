"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Customer, UserProfile } from "@/types/domain";
import { orderSchema, type OrderInput, type OrderValues } from "@/schemas/order.schema";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { appendOrderImageId, createOrder, fetchMembers, listenCustomers } from "@/services/firestore.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
import { notifyNewOrder } from "@/services/notification-catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function NewOrderModulePage() {
  const router = useRouter();
  const { businessId, user, ready } = useBusinessContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tailors, setTailors] = useState<UserProfile[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, formState } = useForm<OrderInput, undefined, OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), quantity: 1 },
  });

  useEffect(() => {
    if (!ready) {
      return;
    }
    const unsub = listenCustomers(businessId, setCustomers);
    fetchMembers(businessId).then((rows) => setTailors(rows.filter((member) => member.role === "tailor")));
    return () => {
      unsub();
    };
  }, [businessId, ready]);

  const onSubmit: SubmitHandler<OrderValues> = async (values) => {
    if (!user) {
      return;
    }
    const customer = customers.find((entry) => entry.id === values.customerId);
    if (!customer) {
      toast.error("Customer is required");
      return;
    }

    const tailor = tailors.find((entry) => entry.uid === values.assignedTailorId);

    try {
      const orderId = await createOrder(
        businessId,
        {
          businessId,
          customerId: customer.id,
          customerName: customer.fullName,
          customerPhone: customer.phone,
          assignedTailorId: tailor?.uid,
          assignedTailorName: tailor?.displayName,
          garments: [
            {
              name: values.garmentName,
              quantity: values.quantity,
              agreedPrice: values.agreedPrice,
              styleNotes: values.designNotes,
            },
          ],
          measurementsSnapshot: customer.measurements,
          designNotes: values.designNotes,
          fabricSelections: [],
          dueDate: values.dueDate,
          subtotalAmount: values.agreedPrice * values.quantity,
        },
        values.depositAmount,
        {
          uid: user.uid,
          name: user.displayName,
        }
      );
      if (imageFile) {
        const meta = await uploadImage({
          file: imageFile,
          businessId,
          uploadedByUid: user.uid,
          orderId,
          customerId: customer.id,
        });
        await appendOrderImageId(businessId, orderId, meta.id);
      }
      await notifyNewOrder(businessId, `FF-${Date.now().toString().slice(-6)}`, customer.fullName, orderId, user.uid);
      toast.success("Order created");
      router.push(`/orders/${orderId}`);
    } catch {
      toast.error("Could not create order");
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>New Tailoring Order</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label>Customer</Label>
            <Select {...register("customerId")}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName} ({customer.phone})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assigned tailor</Label>
            <Select {...register("assignedTailorId")}>
              <option value="">Unassigned</option>
              {tailors.map((tailor) => (
                <option key={tailor.uid} value={tailor.uid}>{tailor.displayName}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Garment</Label>
            <Input {...register("garmentName")} />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" {...register("quantity")} />
          </div>
          <div>
            <Label>Price per garment</Label>
            <Input type="number" {...register("agreedPrice")} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
          <div>
            <Label>Deposit</Label>
            <Input type="number" {...register("depositAmount")} />
          </div>
          <div className="md:col-span-2">
            <Label>Design / style notes</Label>
            <Textarea {...register("designNotes")} />
          </div>
          <div className="md:col-span-2">
            <Label>Garment reference image (optional)</Label>
            <Input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving..." : "Create order"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
