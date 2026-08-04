import { z } from "zod";

export const orderSchema = z.object({
  customerId: z.string().min(1),
  garmentName: z.string().min(2),
  quantity: z.coerce.number().min(1),
  agreedPrice: z.coerce.number().min(1),
  designNotes: z.string().optional(),
  dueDate: z.string().min(1),
  assignedTailorId: z.string().optional(),
  depositAmount: z.coerce.number().min(0),
});

export type OrderValues = z.infer<typeof orderSchema>;
export type OrderInput = z.input<typeof orderSchema>;

/**
 * Unified order form — order-level fields only. Line items are dynamic and
 * managed outside react-hook-form (each with its own item_type + workflow).
 */
export const newOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  assignedTailorId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  depositAmount: z.coerce.number().min(0).optional(),
  designNotes: z.string().optional(),
});

export type NewOrderValues = z.infer<typeof newOrderSchema>;
export type NewOrderInput = z.input<typeof newOrderSchema>;

export const orderMemberGarmentSchema = z.object({
  name: z.string().min(1, "Garment name is required"),
  quantity: z.coerce.number().min(1),
  agreedPrice: z.coerce.number().min(0),
  styleNotes: z.string().optional(),
});

export type OrderMemberGarmentValues = z.infer<typeof orderMemberGarmentSchema>;

export const orderMemberSchema = z.object({
  memberCustomerId: z.string().min(1, "Select a member"),
  memberName: z.string().min(1),
  gender: z.string().optional(),
  department: z.string().optional(),
  measurements: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
  notes: z.string().optional(),
  garments: z.array(orderMemberGarmentSchema).min(1, "Add at least one garment for this member"),
});

export type OrderMemberValues = z.infer<typeof orderMemberSchema>;

export const materialUsageSchema = z.object({
  materialId: z.string().min(1, "Select a material"),
  materialName: z.string().min(1),
  quantityUsed: z.coerce.number().min(0.01, "Quantity must be more than 0"),
  unit: z.string().min(1),
});

export type MaterialUsageInput = z.input<typeof materialUsageSchema>;
export type MaterialUsageValues = z.infer<typeof materialUsageSchema>;
