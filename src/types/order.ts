export type OrderStatus =
  | "New"
  | "In Progress"
  | "Cutting"
  | "Sewing"
  | "Fitting"
  | "Finishing"
  | "Ready for Pickup"
  | "Waiting for Customer Pickup"
  | "Completed & Picked"
  | "Delivered"
  | "Cancelled";

export type WorkflowStage =
  | "cutting"
  | "stitching"
  | "fitting"
  | "finishing"
  | "finished"
  | "delivered";

export interface OrderMeasurement {
  chest: string;
  waist: string;
  hips: string;
  height: string;
  shoulder?: string;
  sleeve?: string;
  [key: string]: string | undefined;
}

export interface OrderGarment {
  name: string;
  quantity: number;
  fabricUsed?: number;
  notes?: string;
}

export interface OrderFabricUsage {
  rollId: string;
  rollName: string;
  metersUsed: number;
  color: string;
}

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  method: "cash" | "mpesa" | "bank";
  reference?: string;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  employeeId: string;
  employeeName: string;
  garments: OrderGarment[];
  status: OrderStatus;
  stage: WorkflowStage;
  measurements: OrderMeasurement;
  fabricUsage: OrderFabricUsage[];
  payments: OrderPayment[];
  total: number;
  paid: number;
  balanceDue: number;
  deposit: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  notes?: string;
}
