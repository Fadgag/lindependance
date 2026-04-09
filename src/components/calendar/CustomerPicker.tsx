"use client"

import * as React from "react"
import { Check, ChevronsUpDown, UserPlus, Search } from "lucide-react"
import { cn } from '../../lib/utils' // Utilitaire shadcn classique (path relatif)

type Customer = { id: string; firstName: string; lastName: string }

export function CustomerPicker({ customers, onSelect, selectedId }: {
    customers: Customer[]
    onSelect: (id: string) => void
    selectedId?: string | null
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const filteredCustomers = (customers || []).filter((c: Customer) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
    )

    const selectedCustomer = (customers || []).find((c) => c.id === selectedId)

    return (
        <div className="relative w-full">
            <div
                onClick={() => setOpen(!open)}
                className="flex items-center gap-3.5 w-full bg-white border border-slate-200 rounded-xl p-3 text-sm cursor-pointer hover:border-atelier-primary transition-colors"
            >
                <Search size={18} className="text-slate-400" />
                <span className={cn("flex-1", !selectedCustomer && "text-slate-400")}>
          {selectedCustomer
              ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
              : "Rechercher un client..."}
        </span>
                <ChevronsUpDown size={16} className="text-slate-400" />
            </div>

            {open && (
                <div
                    className="absolute top-full left-0 w-full mt-2 border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2"
                    style={{ backgroundColor: '#FFFFFF', zIndex: 120 }}
                >
                    <input
                        className="w-full p-3 border-b border-slate-100 outline-none text-sm font-sans"
                        placeholder="Taper un nom..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer: Customer) => (
                                <div
                                    key={customer.id}
                                    onClick={() => {
                                        onSelect(customer.id)
                                        setOpen(false)
                                    }}
                                    className="flex items-center justify-between p-2.5 text-sm rounded-lg hover:bg-atelier-light cursor-pointer group"
                                >
                  <span className="group-hover:text-atelier-dark font-medium">
                    {customer.firstName} {customer.lastName}
                  </span>
                                    {selectedId === customer.id && <Check size={16} className="text-atelier-primary" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-xs text-slate-500 mb-2">Aucun client trouvé</p>
                                <button className="text-xs font-bold text-atelier-primary flex items-center gap-1 mx-auto hover:underline">
                                    <UserPlus size={14} /> {`Créer "${search}"`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}