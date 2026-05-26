export type EmployeeRole =
  | "admin"
  | "manager"
  | "tailor"
  | "ironman"
  | "cutter"
  | "receptionist"
  | "fitter";

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  email: string;
  role: EmployeeRole;
  businessId: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  photoURL?: string;
  assignedOrdersCount?: number;
  completedOrdersCount?: number;
}
