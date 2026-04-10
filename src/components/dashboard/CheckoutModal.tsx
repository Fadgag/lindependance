"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, X, CheckCircle2, StickyNote, Save, Banknote, Landmark } from "lucide-react";
import { toast } from "sonner";
import type { CheckoutAppointment, Extra, AppointmentSummary } from "@/types/models";

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
                value={extra.price || ""}
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
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CB");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!appointment) return

        // helper to safely extract extras from different appointment shapes
        const extractExtras = (a: CheckoutAppointment | AppointmentSummary): Extra[] => {
            // direct extras field (string or array)
            if ('extras' in a && a.extras != null) {
                const val = a.extras
                if (typeof val === 'string') {
                    try { return JSON.parse(val) as Extra[] } catch { return [] }
                }
                if (Array.isArray(val)) return val as Extra[]
            }
            // fallback to extendedProps.extras
            const ext = a.extendedProps?.extras
            if (ext != null) {
                if (typeof ext === 'string') {
                    try { return JSON.parse(ext) as Extra[] } catch { return [] }
                }
                if (Array.isArray(ext)) return ext as Extra[]
            }
            return []
        }

        setExtras(extractExtras(appointment))

        const extractNote = (a: CheckoutAppointment | AppointmentSummary): string => {
            // prefer note (lowercase), then Note (uppercase), then extendedProps.note
            if ('note' in a && typeof a.note === 'string') return a.note
            if ('Note' in a) {
                // RAISON: `Note` (uppercase) est une propriété legacy fournie par Prisma dans certains shape de CheckoutAppointment
                const val = (a as CheckoutAppointment).Note
                if (typeof val === 'string') return val
            }
            const extNote = a.extendedProps?.note
            return typeof extNote === 'string' ? extNote : ''
        }

        setNote(extractNote(appointment))

        const extractPaymentMethod = (a: CheckoutAppointment | AppointmentSummary): string => {
            if ('paymentMethod' in a) {
                // RAISON: `paymentMethod` peut être présent directement sur CheckoutAppointment (legacy Prisma field)
                const val = (a as CheckoutAppointment).paymentMethod
                if (typeof val === 'string') return val
            }
            const extPm = a.extendedProps?.paymentMethod
            return typeof extPm === 'string' ? extPm : 'CB'
        }

        setPaymentMethod(extractPaymentMethod(appointment))
    }, [appointment]);

    const isPaid = appointment?.status === "PAID" || appointment?.extendedProps?.status === "PAID";
    const service = appointment?.service || appointment?.extendedProps?.service;
    const customer = appointment?.customer || appointment?.extendedProps?.customer;
    const basePrice = service?.price ?? 0;

    const displayPrice = isPaid
        ? (appointment?.finalPrice || appointment?.extendedProps?.finalPrice || basePrice)
        : basePrice + extras.reduce((sum, item) => sum + item.price, 0);

    const handleConfirm = async () => {
        if (!appointment) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/appointments/${appointment.id}/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ totalPrice: displayPrice, extras, note, paymentMethod }),
            });
            if (res.ok) { toast.success("Enregistré !"); onRefresh(); onClose(); }
        } catch (error) { toast.error("Erreur"); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-gray-900">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

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
                    {/* Section Paiement */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Mode de règlement</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <PaymentMethodBtn id="CB" label="Carte" icon={CreditCard} active={paymentMethod === "CB"} disabled={isPaid} onClick={setPaymentMethod} />
                            <PaymentMethodBtn id="CASH" label="Espèces" icon={Banknote} active={paymentMethod === "CASH"} disabled={isPaid} onClick={setPaymentMethod} />
                            <PaymentMethodBtn id="CHECK" label="Chèque" icon={Landmark} active={paymentMethod === "CHECK"} disabled={isPaid} onClick={setPaymentMethod} />
                        </div>
                    </div>

                    {/* Section Note */}
                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <StickyNote size={14} /> Note de séance
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm min-h-[100px] outline-none italic resize-none"
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

                {/* Footer */}
                <div className={`p-6 border-t space-y-4 ${isPaid ? 'bg-green-50/50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-end px-2">
                        <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Total</span>
                        <span className={`text-4xl font-black ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>{displayPrice} €</span>
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${isPaid ? 'bg-gray-900' : 'bg-indigo-600'} text-white disabled:opacity-50`}
                    >
                        {loading ? "..." : (isPaid ? <><Save size={20} /> Mettre à jour</> : "Confirmer")}
                    </button>
                </div>
            </div>
        </div>
    );
}