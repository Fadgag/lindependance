"use client";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Line,
    Legend,
    ReferenceLine,
} from "recharts";

interface ChartData {
    date: string;
    realized: number;
    planned: number;
    count: number;
    target?: number;
}

export default function DashboardCharts({ data }: { data: ChartData[] }) {
    // On formate la date pour l'affichage (ex: 2024-10-12 -> 12/10)
    const formattedData = data.map((d) => ({
        ...d,
        displayDate: d.date.split("-").reverse().slice(0, 2).join("/"),
    }));

    return (
        <div className="h-[400px] w-full bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Activité commerciale</h3>
    <p className="text-sm text-gray-500">Chiffre d&apos;affaires journalier (€)</p>
    </div>

    <ResponsiveContainer width="100%" height={350}>
    <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
    <defs>
        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
    </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />

    {/* Reference line showing daily target (if present on first data point) */}
    {formattedData && formattedData.length > 0 && (
      <ReferenceLine
        y={formattedData[0]?.target ?? 0}
        stroke="#ef4444"
        label={{ position: 'right', value: 'Objectif', fill: '#ef4444' }}
      />
    )}

    <XAxis
        dataKey="displayDate"
    fontSize={12}
    tickLine={false}
    axisLine={false}
    tick={{ fill: '#9ca3af' }}
    minTickGap={30}
    />

    <YAxis
    fontSize={12}
    tickLine={false}
    axisLine={false}
    tick={{ fill: '#9ca3af' }}
    tickFormatter={(value) => `${value}€`}
    />

    <Tooltip
    contentStyle={{
        backgroundColor: '#fff',
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }}
    itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
    // RAISON: Recharts Formatter type est incompatible avec les surcharges TS strictes — cast `any` local nécessaire
    formatter={(value: any) => [`${Number(value ?? 0)} €`, "Revenu"]}
    labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
    />

        <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => (
                <span className="text-sm text-gray-600 ml-2">
                {String(value) === "realized" ? "CA Réalisé" : "CA Prévu"}
              </span>
            )}
        />

        {/* Ligne 2 : CA Prévu (Ligne Pointillée) - On la met en premier pour qu'elle soit derrière */}
        <Line
            type="monotone"
            dataKey="planned"
            name="planned"
            stroke="#94a3b8" // Gris bleu discret
            strokeWidth={2}
            strokeDasharray="5 5" // Ligne en pointillés
            dot={false}
            activeDot={{ r: 6, stroke: "#94a3b8", strokeWidth: 2, fill: "#fff" }}
        />

    <Area
    type="monotone"
    dataKey="realized"
    stroke="#6366f1"
    strokeWidth={3}
    fillOpacity={1}
    fill="url(#colorRevenue)"
    animationDuration={1500}
    />
    </AreaChart>
    </ResponsiveContainer>
    </div>
);
}