import { z } from "zod";

export const orderSchema = z.object({
  customerId: z.string().min(1),
  garmentName: z.string().min(2),
  quantity: z.coerce.number().min(1),
  agreedPrice: z.coerce.number().min(1),
  designNotes: z.string().optional(),
  dueDate: z.string().min(1),
  assignedTailorId: z.string().optional(),
  fabricName: z.string().min(2),
  materialId: z.string().optional(),
  fabricMeters: z.coerce.number().min(0.1),
  depositAmount: z.coerce.number().min(0),
});

export type OrderValues = z.infer<typeof orderSchema>;
