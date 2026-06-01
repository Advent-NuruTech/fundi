import { z } from "zod";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  displayName: z.string().min(2),
  businessName: z.string().min(2),
  phone: z.string().min(9).transform(formatPhone).refine(isValidKenyanPhone, {
    message: "Enter a valid Kenyan phone number, for example 254712345678",
  }),
  location: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
