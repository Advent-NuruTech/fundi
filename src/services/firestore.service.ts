// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// See @/lib/supabase.service for all database operations
// All Firebase code below is commented out for rollback safety

export * from "@/lib/supabase.service";

// ============================================================================
// 🔴 FIREBASE ORIGINAL CODE (PRESERVED FOR ROLLBACK)
// ============================================================================
// import {
//   addDoc,
//   collectionGroup,
//   deleteDoc,
//   doc,
//   getDoc,
//   getDocs,
//   onSnapshot,
//   orderBy,
//   query,
//   serverTimestamp,
//   setDoc,
//   updateDoc,
//   where,
//   writeBatch,
//   increment,
//   runTransaction,
//   arrayUnion,
//   Timestamp,
//   startAfter,
//   type DocumentData,
//   type QueryConstraint,
//   type QueryDocumentSnapshot,
// } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { formatKes } from "@/lib/utils";
// import type {
//   Customer,
//   EmployeeInvitation,
//   Business,
//   InventoryMaterial,
//   Order,
//   Payment,
//   PurchaseOrder,
//   StockMovement,
//   Supplier,
//   UserProfile,
//   UserRole,
//   PaymentMethod,
//   ProductionStage,
//   DbUnit,
//   DbCategory,
//   MaterialUsageRecord,
//   FabricMeta,
// } from "@/types/domain";
// import {
//   businessesCollection,
//   customersCollection,
//   materialsCollection,
//   membersCollection,
//   invitationsCollection,
//   ordersCollection,
//   paymentsCollection,
//   purchaseOrdersCollection,
//   stockMovementsCollection,
//   suppliersCollection,
//   usersCollection,
//   unitsCollection,
//   categoriesCollection,
//   consumptionReportsCollection,
//   smsLogsCollection,
// } from "@/services/collections";
// ... (full original implementation preserved for rollback)
