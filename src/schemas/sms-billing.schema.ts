import { z } from "zod";

// ─── SMS packs PUT ───────────────────────────────────────────────────────────

export const smsPackInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  units: z.number().positive(),
  priceKes: z.number().int().positive(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const smsPacksPutSchema = z.object({
  packs: z.array(smsPackInputSchema).min(1),
});

export type SmsPacksInput = z.infer<typeof smsPacksPutSchema>;
