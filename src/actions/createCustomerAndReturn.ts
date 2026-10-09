'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { CustomerCreateSchema } from '@/schemas/customers'
import { revalidatePath } from 'next/cache'

export type CreateCustomerResult =
  | { success: true; customer: { id: string; firstName: string; lastName: string; phone: string | null } }
  | { success: false; error: string }

/**
 * Server Action — crée un nouveau client et retourne son objet.
 * Appelée depuis CustomerPicker pour la création inline.
 * Sécurité : vérifie organizationId depuis la session (Zéro-Trust).
 */
export async function createCustomerAndReturn(
  input: { firstName: string; lastName: string; phone?: string | null }
): Promise<CreateCustomerResult> {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Non autorisé' }
  }

  const orgId = session.user.organizationId

  const parse = CustomerCreateSchema.safeParse(input)
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { firstName, lastName, phone } = parse.data

  const created = await prisma.customer.create({
    data: {
      firstName,
      lastName,
      // RAISON: phone est optionnel — le schéma Prisma accepte null depuis migration 20260415
      phone: phone ?? null,
      organizationId: orgId
    },
    select: { id: true, firstName: true, lastName: true, phone: true }
  })

  revalidatePath('/customers')
  return { success: true, customer: created }
}
