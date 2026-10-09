import type { SoldProduct } from "@/types/models";

export type CheckoutOperation = "payment" | "delete";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getCheckoutErrorMessage(
  operation: CheckoutOperation,
  status: number,
  payload: unknown,
  soldProducts: readonly SoldProduct[] = [],
): string {
  const error = isRecord(payload) ? payload.error : undefined;

  if (status === 401) {
    return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  }

  if (status === 403) {
    return "Vous n'êtes pas autorisé à effectuer cette action. Contactez votre responsable.";
  }

  if (status === 404) {
    return operation === "payment"
      ? "Ce rendez-vous n'est plus disponible. Actualisez la page puis réessayez."
      : "Ce rendez-vous a déjà été supprimé ou n'est plus disponible. Actualisez la page.";
  }

  if (operation === "payment" && status === 409 && error === "Stock insuffisant") {
    const productId = isRecord(payload) ? payload.productId : undefined;
    const product = typeof productId === "string"
      ? soldProducts.find((soldProduct) => soldProduct.productId === productId)
      : undefined;

    return product
      ? `Le stock de « ${product.name} » est insuffisant. Ajustez la quantité puis réessayez.`
      : "Le stock d'un ou plusieurs produits est insuffisant. Ajustez les quantités puis réessayez.";
  }

  if (operation === "payment" && status === 409 && error === "Rendez-vous déjà payé") {
    return "Ce rendez-vous a déjà été encaissé. Actualisez la page pour voir son état.";
  }

  if (operation === "payment" && status === 409 && error === "Produit non trouvé") {
    return "Un produit n'est plus disponible. Actualisez la page puis vérifiez la sélection.";
  }

  if (status === 400) {
    return operation === "payment"
      ? "Les informations du règlement ne sont pas valides. Vérifiez le montant et les produits puis réessayez."
      : "La demande de suppression n'est pas valide. Actualisez la page puis réessayez.";
  }

  return operation === "payment"
    ? "Le règlement n'a pas pu être enregistré. Réessayez. Si le problème persiste, contactez le support."
    : "Le rendez-vous n'a pas pu être supprimé. Réessayez. Si le problème persiste, contactez le support.";
}

export function getCheckoutNetworkErrorMessage(operation: CheckoutOperation): string {
  return operation === "payment"
    ? "Impossible de confirmer l'enregistrement du règlement. Vérifiez votre connexion et actualisez la page avant de réessayer."
    : "Impossible de confirmer la suppression du rendez-vous. Vérifiez votre connexion et actualisez la page avant de réessayer.";
}
