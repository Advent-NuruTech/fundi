import type { Timestamp } from "firebase/firestore";

export type UserRole =
  | "owner"
  | "admin_manager"
  | "tailor"
  | "receptionist"
  | "inventory_manager"
  | "cashier";

export type ProductionStage =
  | "cutting"
  | "stitching"
  | "fitting"
  | "finishing"
  | "ready_for_pickup"
  | "delivered";

export type DeliveryStatus = "pending" | "ready" | "picked";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "mpesa";
export type MaterialCategory = "buttons" | "zips" | "thread" | "elastic" | "lining" | "accessories";
export type MovementType = "stock_in" | "consumption" | "wastage" | "adjustment";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles?: UserRole[];
  businessId: string;
  active: boolean;
  mustChangePassword?: boolean;
  invitedByUid?: string;
  invitedByName?: string;
  createdAt: Timestamp;
  lastActiveAt?: Timestamp;
}

export interface Business {
  id: string;
  name: string;
  phone: string;
  location: string;
  currency: "KES";
  country: "Kenya";
  ownerUid: string;
  createdAt: Timestamp;
}

export interface MeasurementSet {
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeve?: number;
  inseam?: number;
  length?: number;
  neck?: number;
  thigh?: number;
  notes?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email?: string;
  preferences?: string;
  notes?: string;
  outstandingBalance: number;
  lastOrderAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  measurements: MeasurementSet;
}

export interface OrderGarmentItem {
  name: string;
  quantity: number;
  styleNotes?: string;
  agreedPrice: number;
}

export interface FabricSelection {
  materialId?: string;
  materialName: string;
  color?: string;
  rollId?: string;
  metersRequired: number;
}

export interface FittingRecord {
  date: Timestamp;
  notes: string;
  adjustmentSummary?: string;
  byUid: string;
  byName: string;
}

export interface Order {
  id: string;
  businessId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  assignedTailorId?: string;
  assignedTailorName?: string;
  garments: OrderGarmentItem[];
  measurementsSnapshot: MeasurementSet;
  designNotes?: string;
  fabricSelections: FabricSelection[];
  stage: ProductionStage;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  dueDate: string;
  subtotalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  fittingRecords: FittingRecord[];
  productionNotes?: string;
  imageIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InventoryMaterial {
  id: string;
  businessId: string;
  name: string;
  category: MaterialCategory;
  unit: "pcs" | "meters" | "cones";
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
  supplierId?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface FabricRoll {
  id: string;
  businessId: string;
  materialId?: string;
  fabricType: string;
  color: string;
  supplierId?: string;
  metersRemaining: number;
  costPerMeter: number;
  purchasedOn: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StockMovement {
  id: string;
  businessId: string;
  movementType: MovementType;
  materialId?: string;
  materialName: string;
  rollId?: string;
  orderId?: string;
  quantityChange: number;
  unit: string;
  reason: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  contactPerson?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  status: "pending" | "received";
  expectedDate: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  mpesaCode?: string;
  recordedAt: Timestamp;
  recordedByUid: string;
  recordedByName: string;
}

export interface ImageMeta {
  id: string;
  businessId: string;
  orderId?: string;
  customerId?: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format?: string;
  uploadedByUid: string;
  uploadedAt: Timestamp;
}

export interface EmployeeInvitation {
  id: string;
  businessId: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  token: string;
  temporaryPassword: string;
  invitedByUid: string;
  invitedByName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

export interface TenantScoped {
  businessId: string;
}
