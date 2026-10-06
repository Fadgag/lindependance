import { describe, expect, it } from "vitest";
import { getCheckoutErrorMessage, getCheckoutNetworkErrorMessage } from "@/lib/checkoutErrorMessage";
import type { SoldProduct } from "@/types/models";

const soldProduct: SoldProduct = {
  productId: "product-1",
  name: "Soin nourrissant",
  iconName: "Package",
  quantity: 1,
  priceTTC: 12,
  taxRate: 20,
  totalTTC: 12,
  totalTax: 2,
};

describe("checkout error messages", () => {
  it("explains which product has insufficient stock without exposing its id", () => {
    const message = getCheckoutErrorMessage(
      "payment",
      409,
      { error: "Stock insuffisant", productId: soldProduct.productId },
      [soldProduct],
    );

    expect(message).toContain(soldProduct.name);
    expect(message).toContain("Ajustez la quantité");
    expect(message).not.toContain(soldProduct.productId);
  });

  it("uses a safe fallback when an error payload contains technical details", () => {
    const message = getCheckoutErrorMessage(
      "payment",
      500,
      { error: "Prisma connection failed: secret database host" },
    );

    expect(message).toContain("Réessayez");
    expect(message).not.toContain("Prisma");
    expect(message).not.toContain("secret database host");
  });

  it("suggests signing in again when the session has expired", () => {
    expect(getCheckoutErrorMessage("delete", 401, null)).toContain("Reconnectez-vous");
  });

  it("does not confuse a permission error with an expired session", () => {
    expect(getCheckoutErrorMessage("delete", 403, null)).toContain("pas autorisé");
  });

  it("gives an actionable message for network failures", () => {
    expect(getCheckoutNetworkErrorMessage("payment")).toContain("actualisez la page");
    expect(getCheckoutNetworkErrorMessage("delete")).toContain("actualisez la page");
  });
});
