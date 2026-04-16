"use client";

import { useRouter, usePathname } from "next/navigation";
import { Users, Calendar, TrendingUp, Target, ArrowUpRight } from "lucide-react";
import DashboardCharts from "./DashboardCharts";
import type { DashboardData } from "@/types/models";

interface DashboardShellProps {
    initialData: DashboardData;
    currentPeriod: string;
}

export default function DashboardShell({ initialData, currentPeriod }: DashboardShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    // Fonction pour formater les prix en Euros
    const formatEuro = (val: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(val);

    // Navigation par URL pour forcer le rafraîchissement des données serveur
    const handleTabChange = (id: string) => {
        router.push(`${pathname}?period=${id}`);
    };

    const tabs = [
        { id: "today", label: "Aujourd'hui" },
        { id: "week", label: "Cette semaine" },
        { id: "month", label: "Mois en cours" },
        { id: "30days", label: "30 derniers jours" },
    ];

    // Extraction des données réelles du service
    const { summary, timeseries } = initialData;

    // Utilisation des vraies valeurs calculées par le service.
    // Prefer explicit `realizedRevenue` when available, otherwise fall back to
    // legacy `totalRevenue` to remain backward-compatible with older API
    // responses/tests that still return `totalRevenue`.
    const realizedRevenue = (summary.realizedRevenue ?? summary.totalRevenue) || 0;
    const projectedRevenue = summary.projectedRevenue ?? summary.totalRevenue ?? 0;

    const kpis = [
        {
            title: "CA Réalisé",
            value: formatEuro(realizedRevenue),
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            desc: "Total encaissé"
        },
        {
            title: "CA Prévisionnel",
            value: formatEuro(projectedRevenue),
            icon: Target,
            color: "text-blue-600",
            bg: "bg-blue-50",
            desc: "Prévisions (Total)"
        },
        {
            title: "Rendez-vous",
            value: summary.appointmentCount,
            icon: Calendar,
            color: "text-violet-600",
            bg: "bg-violet-50",
            desc: "Volume d'activité"
        },
        {
            title: "Nouveaux Clients",
            value: summary.newCustomerCount,
            icon: Users,
            color: "text-pink-600",
            bg: "bg-pink-50",
            desc: "Acquisition"
        },
    ];

    return (
        <div className="space-y-8">
            {/* Barre de navigation des onglets */}
            <div className="flex items-center justify-between">
                <div className="flex p-1 bg-gray-100 rounded-2xl w-fit border border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                currentPeriod === tab.id
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3 text-xs font-medium text-gray-400">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Dashboard
                    </div>
                    {(summary.totalTaxCollected ?? 0) > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-full border border-gray-100">
                            <span className="text-xs font-bold uppercase text-gray-400">TVA</span>
                            <span className="text-sm font-black">{formatEuro(summary.totalTaxCollected ?? 0)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Grille des KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi) => (
                    <div key={kpi.title} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color} transition-transform group-hover:scale-110 duration-300`}>
                                <kpi.icon size={24} />
                            </div>
                            <div className="p-2 hover:bg-gray-50 rounded-full cursor-help">
                                <ArrowUpRight size={16} className="text-gray-300" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{kpi.title}</p>
                            <p className="text-3xl font-black text-gray-900 tracking-tight">{kpi.value}</p>
                            {/* Breakdown for CA Réalisé */}
                            {kpi.title === 'CA Réalisé' && (
                                <p className="text-sm text-gray-500 mt-2 font-medium">Prestations: {formatEuro(summary.serviceRevenue ?? 0)} / Ventes: {formatEuro(summary.productRevenue ?? 0)}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">{kpi.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section Graphique */}
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Performance Analytique</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Comparaison des revenus réalisés vs prévus</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-[10px] font-bold text-emerald-700 uppercase">Réalisé</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                                <div className="w-2 h-2 bg-blue-50 rounded-full border border-blue-400" />
                                <span className="text-[10px] font-bold text-blue-700 uppercase">Prévisionnel</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <DashboardCharts data={timeseries} />
                    </div>
                </div>
            </div>
        </div>
    );
}