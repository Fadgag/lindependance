'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Lock, ShieldCheck } from 'lucide-react'
import PasswordInput from '@/components/PasswordInput'
import {
  updatePasswordAction,
  type UpdatePasswordState,
} from '@/app/(dashboard)/settings/account/actions'

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<UpdatePasswordState['fieldErrors']>({})
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const formData = new FormData()
    formData.set('currentPassword', currentPassword)
    formData.set('newPassword', newPassword)
    formData.set('confirmPassword', confirmPassword)

    startTransition(async () => {
      const result = await updatePasswordAction({}, formData)

      if (result.success) {
        toast.success('Mot de passe mis à jour avec succès !')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else if (result.error) {
        toast.error(result.error)
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Lock size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h3>
          <p className="text-sm text-gray-500">
            Utilisez un mot de passe fort d&apos;au moins 8 caractères.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mot de passe actuel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe actuel
          </label>
          <PasswordInput
            value={currentPassword}
            onChangeAction={(e) => setCurrentPassword(e.target.value)}
            placeholder="Votre mot de passe actuel"
          />
          {fieldErrors?.currentPassword && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.currentPassword[0]}</p>
          )}
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nouveau mot de passe
          </label>
          <PasswordInput
            value={newPassword}
            onChangeAction={(e) => setNewPassword(e.target.value)}
            placeholder="Au moins 8 caractères"
          />
          {fieldErrors?.newPassword && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.newPassword[0]}</p>
          )}
        </div>

        {/* Confirmation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le nouveau mot de passe
          </label>
          <PasswordInput
            value={confirmPassword}
            onChangeAction={(e) => setConfirmPassword(e.target.value)}
            placeholder="Répétez le nouveau mot de passe"
          />
          {fieldErrors?.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.confirmPassword[0]}</p>
          )}
        </div>

        {/* Indicateur de sécurité */}
        {newPassword.length > 0 && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              newPassword.length >= 8
                ? 'bg-green-50 text-green-700'
                : 'bg-orange-50 text-orange-700'
            }`}
          >
            <ShieldCheck size={16} />
            {newPassword.length >= 8
              ? 'Mot de passe suffisamment long'
              : `Encore ${8 - newPassword.length} caractère(s) requis`}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  )
}

