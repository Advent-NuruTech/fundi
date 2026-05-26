import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  preferences: z.string().optional(),
  notes: z.string().optional(),
  bust: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  hips: z.coerce.number().optional(),
  shoulder: z.coerce.number().optional(),
  sleeve: z.coerce.number().optional(),
  inseam: z.coerce.number().optional(),
  length: z.coerce.number().optional(),
});

export type CustomerValues = z.infer<typeof customerSchema>;
export type CustomerInput = z.input<typeof customerSchema>;
