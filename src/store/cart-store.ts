import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/ecommerce";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  clearSellerItems: (sellerBusinessId: string) => void;
  itemCount: () => number;
  subtotal: () => number;
  getSellerGroups: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) => {
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === incoming.productId &&
              i.variantId === incoming.variantId
          );
          if (existing) {
            const newQty = Math.min(
              existing.quantity + incoming.quantity,
              incoming.maxStock ?? 9999
            );
            return {
              items: state.items.map((i) =>
                i.id === existing.id ? { ...i, quantity: newQty } : i
              ),
            };
          }
          return { items: [...state.items, incoming] };
        });
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, quantity: Math.min(quantity, i.maxStock ?? 9999) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      clearSellerItems: (sellerBusinessId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => i.sellerBusinessId !== sellerBusinessId
          ),
        })),

      itemCount: () => get().items.reduce((n, i) => n + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),

      getSellerGroups: () => {
        const groups: Record<string, CartItem[]> = {};
        for (const item of get().items) {
          if (!groups[item.sellerBusinessId]) {
            groups[item.sellerBusinessId] = [];
          }
          groups[item.sellerBusinessId].push(item);
        }
        return groups;
      },
    }),
    {
      name: "fundiflow-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
