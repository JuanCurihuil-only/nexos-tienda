import { CreditCard } from "lucide-react";
import {
  formatPrice,
  INSTALLMENTS,
  installmentValue,
  productDiscountPercent,
  type Product,
} from "@/lib/products";

/** Bloque destacado de cuotas: "6 cuotas sin interés de $X". */
export function Installments({
  priceCard,
  size = "md",
}: {
  priceCard: number;
  size?: "sm" | "md" | "lg";
}) {
  const lg = size === "lg";
  const sm = size === "sm";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 text-success ${
        lg ? "px-3.5 py-2.5" : sm ? "px-2 py-1" : "px-2.5 py-1.5"
      }`}
    >
      <CreditCard className={`shrink-0 ${lg ? "h-6 w-6" : "h-4 w-4"}`} aria-hidden />
      <p className={`leading-tight ${lg ? "text-base" : sm ? "text-xs" : "text-[13px]"}`}>
        <span className="font-extrabold uppercase tracking-wide">
          {INSTALLMENTS} cuotas sin interés
        </span>{" "}
        <span className="whitespace-nowrap">
          de <strong className="font-extrabold">{formatPrice(installmentValue(priceCard))}</strong>
        </span>
      </p>
    </div>
  );
}

/**
 * Precio al estilo Mercado Libre:
 * grande el precio con transferencia/efectivo y, destacado, las cuotas
 * calculadas sobre el precio de tarjeta (precio de lista).
 */
export function Price({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  if (product.priceCard == null || product.priceTransfer == null) {
    return <p className="text-sm font-semibold text-muted-foreground">Precio a consultar</p>;
  }

  const big = size === "lg";
  const off = productDiscountPercent(product.priceCard, product.priceTransfer);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={`font-display font-extrabold tracking-tight text-foreground ${
            big ? "text-4xl sm:text-[2.6rem]" : "text-2xl"
          }`}
        >
          {formatPrice(product.priceTransfer)}
        </span>
        {off > 0 && (
          <span
            className={`rounded bg-primary px-1.5 py-0.5 font-bold text-primary-foreground ${
              big ? "text-sm" : "text-xs"
            }`}
          >
            {off}% OFF
          </span>
        )}
      </div>
      <p className={`text-muted-foreground ${big ? "text-sm" : "text-xs"}`}>
        con transferencia o efectivo
      </p>
      <div className={big ? "mt-3" : "mt-2"}>
        <Installments priceCard={product.priceCard} size={big ? "lg" : "md"} />
      </div>
      {big && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          Precio con tarjeta: {formatPrice(product.priceCard)}
        </p>
      )}
    </div>
  );
}
