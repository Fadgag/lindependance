"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, X, CheckCircle2, StickyNote, Save, Banknote, Landmark, Package, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { CheckoutAppointment, Extra, AppointmentSummary, SoldProduct } from "@/types/models";
import type { Product } from "@/types/models";
import { parseJsonField } from "@/lib/parseAppointmentJson";
import ProductPicker from "@/components/dashboard/ProductPicker";

// Résolution icône produit
const ICON_MAP: Record<string, LucideIcon> = {
  Package, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star,
}
function ProductIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Package
  return <Icon size={13} />
}

// --- SOUS-COMPOSANTS DE STRUCTURE ---

interface PaymentMethodBtnProps {
    id: string
    label: string
    icon: React.ComponentType<{ size?: number }>
    active: boolean
    disabled: boolean
    onClick: (id: string) => void
}

const PaymentMethodBtn = ({ id, label, icon: Icon, active, disabled, onClick }: PaymentMethodBtnProps) => (
    <button
        disabled={disabled}
        onClick={() => onClick(id)}
        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
            active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
        } ${disabled && !active ? 'opacity-20' : ''}`}
    >
        <Icon size={20} />
        <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
);

interface ExtraRowProps {
    extra: Extra
    index: number
    isPaid: boolean
    onUpdate: (index: number, field: keyof Extra, value: string | number) => void
    onRemove: (index: number) => void
}

const ExtraRow = ({ extra, index, isPaid, onUpdate, onRemove }: ExtraRowProps) => (
    <div className="flex gap-2 items-center group">
        <input
            type="text"
            disabled={isPaid}
            placeholder="Désignation"
            className="flex-1 p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-indigo-500/20 disabled:bg-transparent disabled:font-medium"
            value={extra.label}
            onChange={(e) => onUpdate(index, "label", e.target.value)}
        />
        <div className="relative">
            <input
                type="number"
                disabled={isPaid}
                className="w-20 p-2.5 bg-gray-50 border-none rounded-xl text-sm text-right pr-6 focus:ring-1 focus:ring-indigo-500/20 disabled:bg-transparent disabled:font-bold"
                value={extra.price ?? ""}
                onChange={(e) => onUpdate(index, "price", Number(e.target.value))}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">€</span>
        </div>
        {!isPaid && (
            <button onClick={() => onRemove(index)} className="p-2 text-red-300 hover:text-red-500 rounded-xl transition-all">
                <Trash2 size={16} />
            </button>
        )}
    </div>
);

// --- COMPOSANT PRINCIPAL ---

interface CheckoutModalProps {
    appointment: (CheckoutAppointment | AppointmentSummary) | null
    onClose: () => void
    onRefresh: () => void
}

export default function CheckoutModal({ appointment, onClose, onRefresh }: CheckoutModalProps) {
    const [extras, setExtras] = useState<Extra[]>([]);
    const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [recentProductIds, setRecentProductIds] = useState<string[]>(() => {
        try {
            if (typeof localStorage === 'undefined') return []
            const raw = localStorage.getItem('recent_products')
            return raw ? JSON.parse(raw) as string[] : []
        } catch { return [] }
    })
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CB");
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Charger les produits du catalogue
    useEffect(() => {
        fetch('/api/products', { credentials: 'include' })
            .then((r) => r.ok ? r.json() : [])
            .then((data: Product[]) => setAvailableProducts(data))
            .catch(() => setAvailableProducts([]))
    }, [])

    useEffect(() => {
        if (!appointment) return

        // Extras : top-level (string|array) > extendedProps fallback
        const rawExtras = ('extras' in appointment && appointment.extras != null)
            ? appointment.extras
            : appointment.extendedProps?.extras
        const parsedExtras: Extra[] = typeof rawExtras === 'string'
            ? parseJsonField<Extra>(rawExtras)
            : Array.isArray(rawExtras) ? (rawExtras as Extra[]) : []
        setExtras(parsedExtras)

        // SoldProducts : top-level (string|array) > extendedProps fallback
        const rawSold = ('soldProducts' in appointment ? appointment.soldProducts : null) ?? appointment.extendedProps?.soldProducts
        const parsedSold: SoldProduct[] = typeof rawSold === 'string'
            ? parseJsonField<SoldProduct>(rawSold)
            : Array.isArray(rawSold) ? (rawSold as SoldProduct[]) : []
        setSoldProducts(parsedSold)

        // Note: 'note' (minuscule) prioritaire, puis 'Note' (legacy uppercase Prisma), puis extendedProps
        const note =
            ('note' in appointment && typeof appointment.note === 'string' ? appointment.note : undefined)
            ?? ('Note' in appointment ? (appointment as CheckoutAppointment).Note ?? undefined : undefined)
            ?? (appointment.extendedProps?.note ?? '')
        setNote(typeof note === 'string' ? note : '')

        // RAISON: paymentMethod peut être sur CheckoutAppointment (legacy) ou dans extendedProps
        const pm = ('paymentMethod' in appointment ? (appointment as CheckoutAppointment).paymentMethod : undefined)
            ?? appointment.extendedProps?.paymentMethod
        setPaymentMethod(pm ?? 'CB')
    }, [appointment]);

    const isPaid = appointment?.status === "PAID" || appointment?.extendedProps?.status === "PAID";
    const service = appointment?.service ?? appointment?.extendedProps?.service;
    const customer = appointment?.customer ?? appointment?.extendedProps?.customer;
    const basePrice = Number(service?.price ?? 0);

    const productsTotalTTC = soldProducts.reduce((sum, p) => sum + p.totalTTC, 0)
    const extrasTotalTTC = extras.reduce((sum, e) => sum + e.price, 0)
    const displayPrice = isPaid
        ? (appointment?.finalPrice ?? appointment?.extendedProps?.finalPrice ?? basePrice)
        : basePrice + extrasTotalTTC + productsTotalTTC

    // Ajouter un produit depuis le picker
    const addProduct = (product: Product) => {
        setShowProductPicker(false)
        const existing = soldProducts.findIndex((p) => p.productId === product.id)
        if (existing >= 0) {
            // Incrémenter la quantité si déjà présent
            updateProductQty(existing, soldProducts[existing].quantity + 1)
            return
        }
        const totalTTC = product.priceTTC
        const totalTax = product.taxRate > 0 ? totalTTC - totalTTC / (1 + product.taxRate / 100) : 0
        setSoldProducts((prev) => [...prev, {
            productId: product.id,
            name: product.name,
            iconName: product.iconName,
            quantity: 1,
            priceTTC: product.priceTTC,
            taxRate: product.taxRate,
            totalTTC,
            totalTax: Math.round(totalTax * 100) / 100,
        }])

        // Mettre à jour la liste des récents (populaires) — localStorage MVP
        try {
            setRecentProductIds((prev) => {
                const next = [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 8)
                localStorage.setItem('recent_products', JSON.stringify(next))
                return next
            })
        } catch {}
    }

    const updateProductQty = (index: number, qty: number) => {
        if (qty < 1) return
        setSoldProducts((prev) => prev.map((p, i) => {
            if (i !== index) return p
            const totalTTC = p.priceTTC * qty
            const totalTax = p.taxRate > 0 ? totalTTC - totalTTC / (1 + p.taxRate / 100) : 0
            return { ...p, quantity: qty, totalTTC, totalTax: Math.round(totalTax * 100) / 100 }
        }))
    }

    const removeProduct = (index: number) => setSoldProducts((prev) => prev.filter((_, i) => i !== index))

    const handleConfirm = async () => {
        if (!appointment) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/appointments/${appointment.id}/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ totalPrice: displayPrice, extras, soldProducts, note, paymentMethod }),
            });
            if (res.ok) { toast.success("Enregistré !"); onRefresh(); onClose(); }
        } catch { toast.error("Erreur"); } finally { setLoading(false); }
    };

    const handleDeleteConfirm = async () => {
        if (!appointment) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/appointments?id=${encodeURIComponent(appointment.id)}&from=checkout&confirm=true`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success('RDV supprimé');
                try { window.dispatchEvent(new CustomEvent('appointments:updated')) } catch {}
                onRefresh();
                onClose();
            } else {
                toast.error(data?.error || 'Impossible de supprimer le RDV');
            }
        } catch (e) {
            toast.error('Erreur réseau');
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 text-gray-900">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Confirmation suppression RDV (overlay) */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold text-red-600 flex items-center gap-3"><Trash2 /> Supprimer le rendez-vous</h3>
                            <p className="text-sm text-gray-600 mt-2">Êtes-vous sûr·e de vouloir supprimer ce rendez-vous ? Cette action est irréversible.</p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-xl border">Annuler</button>
                                <button onClick={handleDeleteConfirm} disabled={deleteLoading} className="px-4 py-2 rounded-xl bg-red-600 text-white disabled:opacity-50">{deleteLoading ? '...' : 'Supprimer'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center ${isPaid ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        {isPaid && <CheckCircle2 className="text-green-600" size={28} />}
                        <div>
                            <h2 className="text-xl font-bold">{isPaid ? "Détails du règlement" : "Encaisser le RDV"}</h2>
                            <p className="text-sm text-gray-500">{customer?.name} — {service?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Mode de paiement */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Mode de règlement</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <PaymentMethodBtn id="CB" label="Carte" icon={CreditCard} active={paymentMethod === "CB"} disabled={isPaid} onClick={setPaymentMethod} />
                            <PaymentMethodBtn id="CASH" label="Espèces" icon={Banknote} active={paymentMethod === "CASH"} disabled={isPaid} onClick={setPaymentMethod} />
                            <PaymentMethodBtn id="CHECK" label="Chèque" icon={Landmark} active={paymentMethod === "CHECK"} disabled={isPaid} onClick={setPaymentMethod} />
                        </div>
                    </div>

                    {/* Section Produits additionnels */}
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produits additionnels</h3>
                            {!isPaid && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProductPicker((v) => !v)}
                                        className="text-[10px] bg-gray-900 text-white px-3 py-1 rounded-full flex items-center gap-1"
                                        aria-expanded={showProductPicker}
                                        aria-haspopup="listbox"
                                    >
                                        <Plus size={10} /> Ajouter
                                    </button>
                                    {showProductPicker && (
                                        <ProductPicker
                                            products={availableProducts}
                                            onSelect={(p) => { addProduct(p); setShowProductPicker(false); }}
                                            onClose={() => setShowProductPicker(false)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {soldProducts.length === 0 && <p className="text-xs text-gray-400 italic">Aucun produit ajouté.</p>}
                        {soldProducts.map((p, i) => (
                            <div key={p.productId + i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white border border-gray-100 text-slate-500 shrink-0">
                                    <ProductIcon name={p.iconName} />
                                </span>
                                <span className="flex-1 text-xs font-medium text-gray-800 truncate">{p.name}</span>
                                {!isPaid ? (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => updateProductQty(i, p.quantity - 1)} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs hover:bg-gray-300">−</button>
                                        <span className="w-5 text-center text-xs font-bold">{p.quantity}</span>
                                        <button onClick={() => updateProductQty(i, p.quantity + 1)} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs hover:bg-gray-300">+</button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-500">x{p.quantity}</span>
                                )}
                                <span className="text-xs font-bold text-gray-700 w-16 text-right">{p.totalTTC.toFixed(2)} €</span>
                                {!isPaid && (
                                    <button onClick={() => removeProduct(i)} className="p-1 text-red-300 hover:text-red-500 transition-colors">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {soldProducts.length > 0 && soldProducts.some((p) => p.taxRate > 0) && (
                            <p className="text-[10px] text-gray-400 text-right">
                                dont TVA : {soldProducts.reduce((s, p) => s + p.totalTax, 0).toFixed(2)} €
                            </p>
                        )}
                    </div>

                    {/* Section Note */}
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <StickyNote size={14} /> Note de séance
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm min-h-20 outline-none italic resize-none"
                            placeholder="Observations..."
                        />
                    </div>

                    {/* Section Extras */}
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suppléments</h3>
                            {!isPaid && (
                                <button onClick={() => setExtras([...extras, { label: "", price: 0 }])} className="text-[10px] bg-gray-900 text-white px-3 py-1 rounded-full">+ AJOUTER</button>
                            )}
                        </div>
                        {extras.length === 0 && <p className="text-xs text-gray-400 italic">Aucun supplément.</p>}
                        {extras.map((extra, index) => (
                            <ExtraRow
                                key={index}
                                extra={extra}
                                index={index}
                                isPaid={isPaid}
                                onRemove={(i: number) => setExtras(extras.filter((_, idx) => idx !== i))}
                                onUpdate={(i: number, f: keyof Extra, v: string | number) => {
                                    const next = [...extras]; next[i] = { ...next[i], [f]: v }; setExtras(next);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer avec total dynamique */}
                <div className={`p-6 border-t space-y-4 ${isPaid ? 'bg-green-50/50' : 'bg-gray-50'}`}>
                    {/* Détail du total */}
                    {!isPaid && (basePrice > 0 || soldProducts.length > 0) && (
                        <div className="space-y-1 text-xs text-gray-400 px-2">
                            <div className="flex justify-between">
                                <span>Prestation</span>
                                <span>{basePrice.toFixed(2)} €</span>
                            </div>
                            {extrasTotalTTC > 0 && (
                                <div className="flex justify-between">
                                    <span>Suppléments</span>
                                    <span>{extrasTotalTTC.toFixed(2)} €</span>
                                </div>
                            )}
                            {productsTotalTTC > 0 && (
                                <div className="flex justify-between">
                                    <span>Produits ({soldProducts.length})</span>
                                    <span>{productsTotalTTC.toFixed(2)} €</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex justify-between items-end px-2">
                        <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Total TTC</span>
                        <span className={`text-4xl font-black ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>{Number(displayPrice).toFixed(2)} €</span>
                    </div>
                    {/* Bouton supprimer RDV (visible uniquement si le RDV n'est pas encore payé) */}
                    {appointment && !isPaid && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <Trash2 size={18} /> Supprimer le RDV
                            </button>

                            <button
                                onClick={handleConfirm}
                                disabled={loading || isPaid && soldProducts.length === 0 && extras.length === 0}
                                className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${isPaid ? 'bg-gray-900' : 'bg-indigo-600'} text-white disabled:opacity-50`}
                            >
                                {loading ? "..." : (isPaid ? <><Save size={20} /> Mettre à jour</> : "Confirmer l'encaissement")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}