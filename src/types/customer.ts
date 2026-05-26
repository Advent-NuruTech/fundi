export interface CustomerMeasurement {
  chest: string;
  waist: string;
  hips: string;
  height: string;
  shoulder?: string;
  sleeve?: string;
  [key: string]: string | undefined;
}

export interface CustomerPreference {
  style: string;
  fit: string;
  notes?: string;
}

export interface CustomerPayment {
  id: string;
  date: string;
  amount: number;
  method: "cash" | "mpesa" | "bank";
  reference?: string;
  notes?: string;
}

export interface CustomerOrderRef {
  id: string;
  type: string;
  status: string;
  employee: string;
  employeeId?: string;
  total: number;
  paid: number;
  balance: number;
  progress: number;
  collectionDate: string;
  images?: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  businessId: string;
  addedBy: string;
  addedByName: string;
  createdAt: string;
  totalOrders: number;
  activeOrders: number;
  lastVisit: string;
  balance: number;
  preferences: CustomerPreference;
  measurements: CustomerMeasurement;
  orders: CustomerOrderRef[];
  payments: CustomerPayment[];
  notes?: string;
}
