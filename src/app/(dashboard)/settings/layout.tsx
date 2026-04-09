"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Scissors, User } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: "Général & CA", href: "/settings", icon: Landmark, disabled: false },
        { name: "Prestations", href: "/settings/services", icon: Scissors, disabled: false },
        { name: "Mon Compte", href: "/settings/account", icon: User, disabled: false },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
                <p className="text-gray-500 mt-1">Gérez la configuration de votre salon et vos objectifs.</p>
            </div>

            {/* Navigation par onglets en haut */}
            <div className="border-b border-gray-200 mb-8">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.disabled ? '#' : tab.href}
                                aria-disabled={tab.disabled}
                                onClick={tab.disabled ? (e) => e.preventDefault() : undefined}
                                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all
                  ${tab.disabled
                                    ? "border-transparent text-gray-300 cursor-not-allowed"
                                    : isActive
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                `}
                            >
                                <tab.icon size={18} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Contenu de la page (Full Width) */}
            <div className="w-full">
                {children}
            </div>
        </div>
    );
}