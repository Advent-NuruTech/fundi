# FundiFlow

Production-ready tailoring business management SaaS for Kenyan fashion workshops.

## Core Workflow

Customer arrival -> Measurements -> Style design -> Fabric choice -> Deposit -> Work assignment -> Tailoring -> Fitting adjustments -> Final payment -> Delivery -> Repeat customer

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Firebase Auth (Email/Password)
- Firestore realtime data
- Cloudinary image storage + Firestore metadata
- React Hook Form + Zod
- Zustand
- TanStack Table
- Framer Motion

## Modules

- Dashboard: `/dashboard`
- Customers: `/customers`, `/customers/[id]`
- Orders: `/orders`, `/orders/new`, `/orders/[id]`
- Production: `/production`, `/production/kanban`
- Inventory: `/inventory` and subroutes
- Payments/POS: `/payments`, `/pos`
- Analytics: `/analytics`

## Firestore Architecture

Tenant-first structure:

- `users/{uid}`
- `businesses/{businessId}`
- `businesses/{businessId}/members/{uid}`
- `businesses/{businessId}/customers/{customerId}`
- `businesses/{businessId}/orders/{orderId}`
- `businesses/{businessId}/inventory_materials/{materialId}`
- `businesses/{businessId}/fabric_rolls/{rollId}`
- `businesses/{businessId}/stock_movements/{movementId}`
- `businesses/{businessId}/purchase_orders/{poId}`
- `businesses/{businessId}/suppliers/{supplierId}`
- `businesses/{businessId}/payments/{paymentId}`
- `businesses/{businessId}/images/{imageId}`

No duplicated production tables: production is derived from `orders.stage`.
No low-stock collection: low stock is derived from inventory thresholds.
No analytics collection: analytics is computed from operational collections.

## Cloudinary Flow

1. Client uploads image directly to Cloudinary.
2. App stores metadata only in Firestore `images`.
3. Order/Customer docs keep image IDs or URLs references.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create `.env.local` from `.env.example`.
3. Run development server:
   - `npm run dev`

## Required Environment Variables

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## Firebase Security + Indexes

- Rules: `firestore.rules`
- Indexes: `firestore.indexes.json`

Deploy them with Firebase CLI:

- `firebase deploy --only firestore:rules,firestore:indexes`

## Build

- `npm run build`
- `npm run start`
