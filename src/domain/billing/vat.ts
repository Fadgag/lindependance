/**
 * Règles de calcul de TVA sur les montants TTC (produits vendus lors d'un encaissement).
 *
 * Fonctions pures : aucune dépendance à Next.js, Prisma ou React. Testables en unitaire
 * sans mock. Utilisées à la fois par la couche agrégation (`services/dashboard.service.ts`)
 * et par l'UI d'encaissement (`components/dashboard/CheckoutModal.tsx`) pour éviter toute
 * divergence de calcul entre les deux.
 */
import Decimal from 'decimal.js'

/** Arrondit un montant à 2 décimales (centimes). */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeCheckoutTotal(
  servicePrice: number,
  extraPrices: readonly number[],
  productTotals: readonly number[],
): number {
  const extrasTotal = extraPrices.reduce((sum, price) => sum + price, 0)
  const productsTotal = productTotals.reduce((sum, total) => sum + total, 0)
  return roundToCents(servicePrice + extrasTotal + productsTotal)
}

/**
 * Calcule la TVA incluse dans un montant TTC pour un taux donné.
 * Formule: totalTTC - totalTTC / (1 + taxRate/100)
 * Retourne 0 si le taux est nul ou négatif.
 */
export function computeVatFromTtc(totalTTC: number, taxRate: number): number {
  if (!taxRate || taxRate <= 0 || !totalTTC) return 0
  const ttc = new Decimal(String(totalTTC))
  const rate = new Decimal(String(taxRate))
  const tax = ttc.minus(ttc.dividedBy(new Decimal(1).plus(rate.dividedBy(100))))
  return tax.toNumber()
}

export interface SoldProductLine {
  totalTTC: number
  totalTax: number
}

/**
 * Calcule le total TTC et la TVA d'une ligne de produit vendu (prix unitaire TTC x quantité).
 * La TVA est arrondie au centime (comportement attendu à l'affichage encaissement).
 */
export function computeSoldProductLine(priceTTC: number, quantity: number, taxRate: number): SoldProductLine {
  const totalTTC = priceTTC * quantity
  const totalTax = roundToCents(computeVatFromTtc(totalTTC, taxRate))
  return { totalTTC, totalTax }
}
