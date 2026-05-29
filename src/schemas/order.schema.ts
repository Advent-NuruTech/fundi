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

export const materialUsageSchema = z.object({
  materialId: z.string().min(1, "Select a material"),
  materialName: z.string().min(1),
  quantityUsed: z.coerce.number().min(0.01, "Quantity must be more than 0"),
  unit: z.string().min(1),
});

export type MaterialUsageInput = z.input<typeof materialUsageSchema>;
export type MaterialUsageValues = z.infer<typeof materialUsageSchema>;
