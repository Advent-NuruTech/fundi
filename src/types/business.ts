export type BusinessPlan = "starter" | "professional" | "enterprise";

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  plan: BusinessPlan;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface BusinessRegistration {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  adminName: string;
  adminEmail: string;
  password: string;
}
