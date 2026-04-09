import PasswordSettings from '@/components/settings/PasswordSettings'

export default function AccountSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PasswordSettings />
      </div>
    </div>
  )
}

