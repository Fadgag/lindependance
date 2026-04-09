import { auth } from "@/auth";
import dashboardService from "@/services/dashboard.service";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { redirect } from "next/navigation";

// Forcer Next.js à recalculer la page à chaque changement (évite le cache)
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
                                                searchParams
                                            }: {
    searchParams: Promise<{ period?: string }>
}) {
    const session = await auth();

    if (!session?.user?.organizationId) {
        redirect("/auth/signin");
    }

    // 1. On récupère la période depuis l'URL (ex: ?period=week)
    const params = await searchParams;
    const activePeriod = params.period || "30days";

    // 2. On passe cette période au service pour avoir les bons chiffres
    const stats = await dashboardService.getDashboardForOrg(
        session.user.organizationId,
        activePeriod
    );

    return (
        <div className="h-full w-full overflow-y-auto bg-[#fafafa] p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10 pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3">
                            Business Intelligence
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tableau de bord</h1>
                        <p className="text-gray-500 font-medium mt-2 italic">
                            Analyse de votre activité en temps réel.
                        </p>
                    </div>
                </div>

                {/* 3. On passe activePeriod au Shell pour la cohérence visuelle */}
                <DashboardShell initialData={stats} currentPeriod={activePeriod} />
            </div>
        </div>
    );
}