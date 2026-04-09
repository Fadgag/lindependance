"use client";

import { useState, useEffect } from "react";
import { Target, Info } from "lucide-react";
import { toast } from "sonner";

export default function FinanceSettings() {
  const [target, setTarget] = useState<number>(0); // valeur initiale chargée depuis l'API
  const [loading, setLoading] = useState(false);

  // Charger la valeur initiale du dailyTarget au montage
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/organization/settings')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && typeof data?.dailyTarget === 'number') setTarget(data.dailyTarget)
      } catch (err) {
        // silent failure: keep default 0
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        body: JSON.stringify({ dailyTarget: Number(target) }),
      });
      if (res.ok) toast.success("Objectif de CA mis à jour !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Objectifs financiers</h3>
          <p className="text-sm text-gray-500">Définissez vos paliers de rentabilité.</p>
        </div>

        <div className="p-4 border rounded-xl bg-gray-50 flex items-center gap-6">
          <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600">
            <Target size={24} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">CA journalier visé</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="block w-32 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="0.00"
              />
              <span className="text-gray-500 font-medium">€ / jour</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-amber-50 rounded-xl text-amber-800 text-sm">
          <Info size={20} className="shrink-0" />
          <p>Ce montant apparaîtra comme une ligne d'objectif sur votre graphique de bord principal.</p>
        </div>

        <div className="flex justify-end">
          <button
              onClick={handleSave}
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
  );
}