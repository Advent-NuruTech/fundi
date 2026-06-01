import { z } from "zod";

export const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().min(1),
  method: z.enum(["cash", "mpesa"]),
  mpesaCode: z.string().optional(),
  description: z.string().optional(),
});

export type PaymentValues = z.infer<typeof paymentSchema>;
export type PaymentInput = z.input<typeof paymentSchema>;
