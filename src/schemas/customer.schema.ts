import { z } from "zod";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";

export const measurementEntrySchema = z.object({
  name: z.string().min(1, "Measurement name is required"),
  value: z.coerce.number().positive("Value must be a positive number"),
});

export const customerSchema = z
  .object({
    fullName: z.string().optional(),
    phone: z.string().min(9).transform(formatPhone).refine(isValidKenyanPhone, {
      message: "Enter a valid Kenyan phone number, for example 254712345678",
    }),
    email: z.string().email().optional().or(z.literal("")),
    gender: z.enum(["male", "female"]).optional(),
    preferences: z.string().optional(),
    notes: z.string().optional(),
    measurements: z.array(measurementEntrySchema).optional(),
    customerType: z.enum(["individual", "group"]).optional(),
    organizationName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactRole: z.string().optional(),
    taxId: z.string().optional(),
    paymentTerms: z.string().optional(),
    address: z.string().optional(),
    department: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isGroup = data.customerType === "group";
    if (isGroup) {
      if (!data.organizationName || data.organizationName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["organizationName"],
          message: "Organization name must be at least 2 characters",
        });
      }
    } else if (!data.fullName || data.fullName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Full name must be at least 2 characters",
      });
    }
  });

export const updateCustomerSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(9).transform(formatPhone).refine(isValidKenyanPhone, {
    message: "Enter a valid Kenyan phone number, for example 254712345678",
  }).optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female"]).optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
  measurements: z.array(measurementEntrySchema).optional(),
  customerType: z.enum(["individual", "group"]).optional(),
  organizationName: z.string().min(2).optional(),
  contactPerson: z.string().optional(),
  contactRole: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
});

export type CustomerValues = z.infer<typeof customerSchema>;
export type CustomerInput = z.input<typeof customerSchema>;
export type UpdateCustomerValues = z.input<typeof updateCustomerSchema>;
export type MeasurementEntry = z.infer<typeof measurementEntrySchema>;
