"use client"

import { useState, useEffect } from "react"
import { Clock, Info } from "lucide-react"
import { toast } from "sonner"

export default function ScheduleSettings() {
  const [openingTime, setOpeningTime] = useState("08:00")
  const [closingTime, setClosingTime] = useState("20:00")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/organization/settings")
        if (!res.ok) return
        const data = await res.json()
        if (mounted) {
          if (typeof data?.openingTime === "string") setOpeningTime(data.openingTime)
          if (typeof data?.closingTime === "string") setClosingTime(data.closingTime)
        }
      } catch {
        // silent failure
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    if (openingTime >= closingTime) {
      toast.error("L'heure d'ouverture doit être avant l'heure de fermeture.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingTime, closingTime }),
      })
      if (res.ok) {
        toast.success("Horaires mis à jour !")
        // Notifier l'agenda pour qu'il recharge ses paramètres
        window.dispatchEvent(new CustomEvent("organization:settings-updated"))
      } else {
        toast.error("Erreur lors de la sauvegarde.")
      }
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Horaires d&apos;ouverture</h3>
        <p className="text-sm text-gray-500">
          Ces horaires définissent la plage visible sur l&apos;agenda et les créneaux autorisés pour les rendez-vous.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded-xl bg-gray-50 flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600">
            <Clock size={20} />
          </div>
          <div className="flex-1">
            <label htmlFor="opening-time" className="block text-sm font-medium text-gray-700 mb-1">
              Ouverture
            </label>
            <input
              id="opening-time"
              aria-label="Heure d'ouverture"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-gray-50 flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600">
            <Clock size={20} />
          </div>
          <div className="flex-1">
            <label htmlFor="closing-time" className="block text-sm font-medium text-gray-700 mb-1">
              Fermeture
            </label>
            <input
              id="closing-time"
              aria-label="Heure de fermeture"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 p-4 bg-blue-50 rounded-xl text-blue-800 text-sm">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p>
          L&apos;agenda affichera uniquement la plage entre ces deux horaires. Les rendez-vous hors plage seront bloqués.
        </p>
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
  )
}

