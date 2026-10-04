"use client";

import FinanceSettings from "@/components/settings/FinanceSettings";
import BrandingSettings from "@/components/settings/BrandingSettings";

export default function GeneralSettingsPage() {
  return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <FinanceSettings />
        </div>
        <BrandingSettings />
      </div>
  );
}