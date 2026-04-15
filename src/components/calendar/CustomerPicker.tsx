"use client"

import * as React from "react"
import { Check, ChevronsUpDown, UserPlus, Search, X, Loader2 } from "lucide-react"
import { cn } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { createCustomerAndReturn } from '@/actions/createCustomerAndReturn'

type Customer = { id: string; firstName: string; lastName: string }
type CreatedCustomer = { id: string; firstName: string; lastName: string; phone?: string | null }

export function CustomerPicker({ customers, onSelectAction, selectedId, onCreatedAction }: {
    customers: Customer[]
    onSelectAction: (id: string) => void
    selectedId?: string | null
    /** Called after a quick-create with the full new customer object */
    onCreatedAction?: (customer: CreatedCustomer) => void
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    // keep created customer locally so trigger shows name before parent list refreshes
    const [localCustomer, setLocalCustomer] = React.useState<Customer | null>(null)

    // Reset localCustomer when selectedId is cleared from outside (e.g. form reset)
    React.useEffect(() => {
        if (!selectedId) setLocalCustomer(null)
    }, [selectedId])

    // inline creation form state
    const [creating, setCreating] = React.useState(false)
    const [createFirst, setCreateFirst] = React.useState("")
    const [createLast, setCreateLast] = React.useState("")
    const [createPhone, setCreatePhone] = React.useState("")
    const [createLoading, setCreateLoading] = React.useState(false)
    const [createError, setCreateError] = React.useState<string | null>(null)

    const filteredCustomers = (customers || []).filter((c: Customer) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
    )

    const selectedCustomer = (customers || []).find((c) => c.id === selectedId)
        // fallback to locally created customer if not yet in parent list
        ?? (localCustomer?.id === selectedId ? localCustomer : null)

    function openCreate() {
        setCreateFirst(search)
        setCreateLast("")
        setCreatePhone("")
        setCreateError(null)
        setCreating(true)
    }

    function cancelCreate() {
        setCreating(false)
        setCreateError(null)
    }

    async function submitCreate() {
        if (!createFirst.trim() || !createLast.trim()) {
            setCreateError("Prénom et nom requis")
            return
        }
        setCreateLoading(true)
        setCreateError(null)
        try {
            const result = await createCustomerAndReturn({
                firstName: createFirst.trim(),
                lastName: createLast.trim(),
                phone: createPhone.trim() || null
            })

            if (!result.success) {
                if (result.existing) {
                    // duplicate phone — select the existing customer directly
                    showToast(`Client existant sélectionné : ${result.existing.firstName} ${result.existing.lastName}`)
                    const existingCust = { id: result.existing.id, firstName: result.existing.firstName, lastName: result.existing.lastName }
                    setLocalCustomer(existingCust)
                    onSelectAction(result.existing.id)
                    onCreatedAction?.(result.existing)
                    setCreating(false)
                    setOpen(false)
                    setSearch("")
                } else {
                    setCreateError(result.error)
                }
            } else {
                showToast(`${result.customer.firstName} ${result.customer.lastName} ajouté(e)`)
                const newCust = { id: result.customer.id, firstName: result.customer.firstName, lastName: result.customer.lastName }
                setLocalCustomer(newCust)
                onSelectAction(result.customer.id)
                onCreatedAction?.(result.customer)
                // notify scheduler to refresh customers list
                try { window.dispatchEvent(new CustomEvent('customers:updated')) } catch {}
                setCreating(false)
                setOpen(false)
                setSearch("")
            }
        } catch (err) {
            setCreateError(String(err))
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <div className="relative w-full">
            {/* Trigger */}
            <div
                onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
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
                    className="absolute top-full left-0 w-full mt-2 border border-slate-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2"
                    style={{ backgroundColor: '#FFFFFF', zIndex: 9999999, overflow: 'visible' }}
                >
                    {!creating ? (
                        <>
                            <input
                                className="w-full p-3 border-b border-slate-100 outline-none text-sm font-sans rounded-t-xl"
                                placeholder="Taper un nom..."
                                value={search}
                                autoFocus
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className="max-h-48 overflow-y-auto p-1">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer: Customer) => (
                                        <div
                                            key={customer.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                onSelectAction(customer.id)
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
                                        <button
                                            type="button"
                                            className="text-xs font-bold text-atelier-primary flex items-center gap-1 mx-auto hover:underline"
                                            onMouseDown={(e) => { e.preventDefault(); openCreate() }}
                                        >
                                            <UserPlus size={14} /> {`Créer "${search}"`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── Inline creation form ── */
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><UserPlus size={13} /> Nouveau client</p>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); cancelCreate() }} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            </div>

                            {createError && <p className="text-xs text-red-600 mb-2">{createError}</p>}

                            {/* Use div instead of form to avoid <form> nesting when inside another form */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex flex-col gap-2"
                            >
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        aria-label="Prénom du nouveau client"
                                        placeholder="Prénom *"
                                        value={createFirst}
                                        onChange={(e) => setCreateFirst(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } }}
                                        className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-atelier-primary"
                                    />
                                    <input
                                        aria-label="Nom du nouveau client"
                                        placeholder="Nom *"
                                        value={createLast}
                                        onChange={(e) => setCreateLast(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } }}
                                        className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-atelier-primary"
                                    />
                                </div>
                                <input
                                    aria-label="Téléphone du nouveau client"
                                    placeholder="Téléphone (optionnel)"
                                    value={createPhone}
                                    onChange={(e) => setCreatePhone(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } }}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-atelier-primary"
                                />
                                <button
                                    type="button"
                                    disabled={createLoading}
                                    onMouseDown={(e) => { e.preventDefault(); submitCreate() }}
                                    className="w-full py-2 rounded-lg bg-atelier-primary text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
                                >
                                    {createLoading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                                    {createLoading ? "Création..." : "Créer et sélectionner"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}