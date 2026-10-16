"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/api/types";
import { readCart, writeCart } from "./storage";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [storedLines, setStoredLines] = useState<CartLine[] | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setStoredLines((previous) => previous ?? readCart()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (storedLines !== null) writeCart(storedLines); }, [storedLines]);

  const update = useCallback((change: (lines: CartLine[]) => CartLine[]) => {
    setStoredLines((previous) => {
      return change(previous ?? []);
    });
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    lines: storedLines ?? [],
    ready: storedLines !== null,
    count: (storedLines ?? []).reduce((sum, line) => sum + line.quantity, 0),
    add: (productId, quantity = 1) => update((lines) => {
      if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) return lines;
      const found = lines.find((line) => line.product_id === productId);
      return found ? lines.map((line) => line.product_id === productId ? { ...line, quantity: Math.min(999, line.quantity + quantity) } : line) : [...lines, { product_id: productId, quantity: Math.min(999, quantity) }];
    }),
    setQuantity: (productId, quantity) => update((lines) => lines.map((line) => line.product_id === productId && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 999 ? { ...line, quantity } : line)),
    remove: (productId) => update((lines) => lines.filter((line) => line.product_id !== productId)),
    clear: () => update(() => []),
  }), [storedLines, update]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider is missing.");
  return value;
}
