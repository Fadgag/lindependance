import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export type UpdatePasswordResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Vérifie l'ancien mot de passe puis met à jour avec le nouveau.
 * Toujours filtré par userId pour éviter toute IDOR.
 */
export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<UpdatePasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, hashedPassword: true },
  })

  if (!user || !user.hashedPassword) {
    return { success: false, error: 'Utilisateur introuvable' }
  }

  const isValid = await bcrypt.compare(currentPassword, user.hashedPassword)
  if (!isValid) {
    return { success: false, error: 'Mot de passe actuel incorrect' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  })

  return { success: true }
}

