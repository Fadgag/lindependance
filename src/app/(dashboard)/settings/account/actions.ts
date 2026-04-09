'use server'

import { auth } from '@/auth'
import { UpdatePasswordSchema } from '@/schemas/password'
import { updateUserPassword } from '@/services/password.service'

export interface UpdatePasswordState {
  success?: boolean
  error?: string
  fieldErrors?: {
    currentPassword?: string[]
    newPassword?: string[]
    confirmPassword?: string[]
  }
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Non authentifié. Veuillez vous reconnecter.' }
  }

  const raw = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = UpdatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const result = await updateUserPassword(
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  )

  if (!result.success) {
    return { error: result.error }
  }

  return { success: true }
}

