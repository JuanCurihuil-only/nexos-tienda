import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProduct, isPurchasable, type Product, type Variant } from "./products";

export type CartLine = { slug: string; variantId?: number | undefined; qty: number };

export type CartItem = {
  key: string;
  product: Product;
  variant?: Variant | undefined;
  qty: number;
  maxQty: number;
};

type CartContextValue = {
  lines: CartLine[];
  items: CartItem[];
  count: number;
  /** Total pagando con transferencia o efectivo */
  totalTransfer: number;
  /** Total pagando con tarjeta (precio de lista) */
  totalCard: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (slug: string, variantId?: number, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nexos-cart-v2";

export const lineKey = (slug: string, variantId?: number) =>
  variantId ? `${slug}::${variantId}` : slug;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* sin almacenamiento disponible */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [lines, loaded]);

  const add = useCallback((slug: string, variantId?: number, qty = 1) => {
    setLines((prev) => {
      const k = lineKey(slug, variantId);
      const found = prev.find((l) => lineKey(l.slug, l.variantId) === k);
      if (found)
        return prev.map((l) =>
          lineKey(l.slug, l.variantId) === k ? { ...l, qty: l.qty + qty } : l,
        );
      return [...prev, { slug, variantId, qty }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => lineKey(l.slug, l.variantId) !== key)
        : prev.map((l) => (lineKey(l.slug, l.variantId) === key ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback(
    (key: string) => setLines((prev) => prev.filter((l) => lineKey(l.slug, l.variantId) !== key)),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const items = useMemo(() => {
    const out: CartItem[] = [];
    for (const l of lines) {
      const product = getProduct(l.slug);
      if (!product || !isPurchasable(product)) continue;
      const variant = l.variantId ? product.variants.find((v) => v.id === l.variantId) : undefined;
      if (l.variantId && (!variant || !variant.available)) continue;
      const maxQty = Math.max(1, variant ? variant.stock : product.stock);
      out.push({
        key: lineKey(l.slug, l.variantId),
        product,
        variant,
        qty: Math.min(l.qty, maxQty),
        maxQty,
      });
    }
    return out;
  }, [lines]);

  const value: CartContextValue = {
    lines,
    items,
    count: items.reduce((a, i) => a + i.qty, 0),
    totalTransfer: items.reduce((a, i) => a + i.qty * (i.product.priceTransfer ?? 0), 0),
    totalCard: items.reduce((a, i) => a + i.qty * (i.product.priceCard ?? 0), 0),
    open,
    setOpen,
    add,
    setQty,
    remove,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
