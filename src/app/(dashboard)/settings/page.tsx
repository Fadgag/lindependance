"use client";

import FinanceSettings from "@/components/settings/FinanceSettings";

export default function GeneralSettingsPage() {
  return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <FinanceSettings />
        </div>
      </div>
  );
}