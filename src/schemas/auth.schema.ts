import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  displayName: z.string().min(2),
  businessName: z.string().min(2),
  phone: z.string().min(10),
  location: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
