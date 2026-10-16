"use client";

import { useEffect, useState } from "react";
import { ApiRequestError, getProduct } from "@/lib/api/client";
import type { CartLine, Product } from "@/lib/api/types";

type Item = { product: Product | null; error: "unavailable" | "network" | null };

export function useCartProducts(lines: CartLine[]) {
  const ids = lines.map((line) => line.product_id).sort((a, b) => a - b).join(",");
  const [state, setState] = useState<{ ids: string; items: Record<number, Item> }>({ ids: "", items: {} });
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    const numbers = ids.split(",").map(Number);
    Promise.all(numbers.map(async (id): Promise<[number, Item]> => {
      try { return [id, { product: (await getProduct(id, controller.signal)).data, error: null }]; }
      catch (error) { return [id, { product: null, error: error instanceof ApiRequestError && error.status === 404 ? "unavailable" : "network" }]; }
    })).then((entries) => { if (!controller.signal.aborted) setState({ ids, items: Object.fromEntries(entries) }); });
    return () => controller.abort();
  }, [ids]);
  return { loading: Boolean(ids) && state.ids !== ids, items: state.ids === ids ? state.items : {} };
}
