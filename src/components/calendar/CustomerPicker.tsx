"use client"

import * as React from "react"
import { Check, ChevronsUpDown, UserPlus, Search, X, Loader2 } from "lucide-react"
import { cn } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { createCustomerAndReturn } from '@/actions/createCustomerAndReturn'

type Customer = { id: string; firstName: string; lastName: string }
type CreatedCustomer = { id: string; firstName: string; lastName: string; phone?: string | null }

export function CustomerPicker({ customers, onSelectAction, selectedId, labelledBy, onCreatedAction }: {
    customers: Customer[]
    onSelectAction: (id: string) => void
    selectedId?: string | null
    labelledBy?: string
    /** Called after a quick-create with the full new customer object */
    onCreatedAction?: (customer: CreatedCustomer) => void
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [activeIndex, setActiveIndex] = React.useState(-1)
    const [selectionAnnouncement, setSelectionAnnouncement] = React.useState("")
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const listboxId = React.useId()
    const popupId = React.useId()
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

    function closePicker(restoreFocus = false) {
        setOpen(false)
        setSearch("")
        setActiveIndex(-1)
        if (restoreFocus) triggerRef.current?.focus()
    }

    function selectCustomer(id: string, customer: Customer) {
        onSelectAction(id)
        setSelectionAnnouncement(`Client sélectionné : ${customer.firstName} ${customer.lastName}`)
        closePicker(true)
    }

    function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            event.preventDefault()
            if (creating) {
                cancelCreate()
            } else {
                closePicker(true)
            }
            return
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (filteredCustomers.length === 0) return
            event.preventDefault()
            setActiveIndex((current) => {
                if (event.key === "ArrowDown") {
                    return current < 0 || current === filteredCustomers.length - 1 ? 0 : current + 1
                }
                return current <= 0 ? filteredCustomers.length - 1 : current - 1
            })
            return
        }

        if (event.key === "Enter" && filteredCustomers.length > 0) {
            event.preventDefault()
            const customer = filteredCustomers[activeIndex >= 0 ? activeIndex : 0]
            selectCustomer(customer.id, customer)
        }
    }

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
                setCreateError(result.error)
            } else {
                showToast(`${result.customer.firstName} ${result.customer.lastName} ajouté(e)`)
                const newCust = { id: result.customer.id, firstName: result.customer.firstName, lastName: result.customer.lastName }
                setLocalCustomer(newCust)
                selectCustomer(result.customer.id, newCust)
                onCreatedAction?.(result.customer)
                // notify scheduler to refresh customers list
                window.dispatchEvent(new CustomEvent('customers:updated'))
                setCreating(false)
            }
        } catch (err: unknown) {
            setCreateError(String(err))
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                type="button"
                aria-label={!labelledBy ? "Client" : undefined}
                aria-labelledby={labelledBy}
                aria-haspopup={creating ? "dialog" : "listbox"}
                aria-expanded={open}
                aria-controls={open ? (creating ? popupId : listboxId) : undefined}
                aria-describedby={`${listboxId}-selection-description`}
                onClick={() => {
                    if (open) closePicker()
                    else {
                        setActiveIndex(-1)
                        setOpen(true)
                    }
                }}
                className="flex items-center gap-3.5 w-full bg-white border border-slate-200 rounded-xl p-3 text-sm cursor-pointer hover:border-atelier-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atelier-primary focus-visible:ring-offset-2"
            >
                <Search size={18} aria-hidden="true" className="text-slate-400" />
                <span className={cn("flex-1", !selectedCustomer && "text-slate-400")}>
                    {selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                        : "Rechercher un client..."}
                </span>
                <ChevronsUpDown size={16} aria-hidden="true" className="text-slate-400" />
            </button>
            <span id={`${listboxId}-selection-description`} className="sr-only">
                {selectedCustomer
                    ? `Client sélectionné : ${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                    : "Aucun client sélectionné"}
            </span>
            <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {selectionAnnouncement}
            </span>

            {open && (
                <div
                    id={creating ? popupId : undefined}
                    role={creating ? "dialog" : undefined}
                    aria-labelledby={creating ? `${popupId}-title` : undefined}
                    className="absolute top-full left-0 w-full mt-2 border border-slate-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2"
                    style={{ backgroundColor: '#FFFFFF', zIndex: 9999999, overflow: 'visible' }}
                >
                    {!creating ? (
                        <>
                            <input
                                role="combobox"
                                aria-label="Rechercher un client"
                                aria-autocomplete="list"
                                aria-expanded={open}
                                aria-controls={listboxId}
                                aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
                                className="w-full p-3 border-b border-slate-100 outline-none text-sm font-sans rounded-t-xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-atelier-primary"
                                placeholder="Taper un nom..."
                                value={search}
                                autoFocus
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setActiveIndex(-1)
                                }}
                                onKeyDown={handleSearchKeyDown}
                            />
                            <div className="max-h-48 overflow-y-auto p-1">
                                <div id={listboxId} role="listbox" aria-label="Clients">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer: Customer, index: number) => (
                                        <div
                                            key={customer.id}
                                            id={`${listboxId}-option-${index}`}
                                            role="option"
                                            aria-selected={selectedId === customer.id}
                                            onClick={() => selectCustomer(customer.id, customer)}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 text-sm rounded-lg cursor-pointer group",
                                                activeIndex === index ? "bg-atelier-light ring-2 ring-inset ring-atelier-primary" : "hover:bg-atelier-light"
                                            )}
                                        >
                                            <span className="group-hover:text-atelier-dark font-medium">
                                                {customer.firstName} {customer.lastName}
                                            </span>
                                            {selectedId === customer.id && <Check size={16} aria-hidden="true" className="text-atelier-primary" />}
                                        </div>
                                    ))
                                ) : null}
                                </div>
                                {filteredCustomers.length === 0 && (
                                    <div className="p-4 text-center">
                                        <p className="text-xs text-slate-500 mb-2">Aucun client trouvé</p>
                                        <button
                                            type="button"
                                            className="text-xs font-bold text-atelier-primary flex items-center gap-1 mx-auto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atelier-primary"
                                            onClick={openCreate}
                                        >
                                            <UserPlus size={14} aria-hidden="true" /> {`Créer "${search}"`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── Inline creation form ── */
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                                <p id={`${popupId}-title`} className="text-xs font-bold text-slate-700 flex items-center gap-1"><UserPlus size={13} /> Nouveau client</p>
                                <button type="button" aria-label="Annuler la création" onClick={cancelCreate} className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atelier-primary">
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
                                    onClick={submitCreate}
                                    className="w-full py-2 rounded-lg bg-atelier-primary text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atelier-primary focus-visible:ring-offset-2"
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