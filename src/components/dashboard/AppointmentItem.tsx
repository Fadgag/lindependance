import { CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { CheckoutAppointment } from '@/types/models';

export function AppointmentItem({ event, onCheckout }: { event: CheckoutAppointment, onCheckout: (apt: CheckoutAppointment) => void }) {
    const isPaid = event.status === "PAID";

    return (
        <div
            className="flex items-center justify-between p-4 border border-studio-border rounded-2xl hover:bg-studio-bg/50 transition-all group cursor-pointer"
            onClick={() => onCheckout(event)} // On rend TOUTE la ligne cliquable pour plus de confort
        >
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center min-w-[50px] py-1 px-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-900">
                        {event.startTime || event.start ? new Date(String(event.startTime ?? event.start)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className="text-[9px] uppercase text-gray-400 font-bold">
                        {event.startTime || event.start ? new Date(String(event.startTime ?? event.start)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                </div>

                <div>
                    <p className="font-bold text-sm text-gray-900 leading-tight">
                        {event.customer?.name || event.title}
                    </p>
                    <p className="text-[11px] text-studio-muted italic">
                        {event.service?.name || "Service"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isPaid ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Empêche le double clic avec la div parente
                            onCheckout(event);
                        }}
                        className="flex items-center gap-1.5 bg-studio-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform shadow-sm"
                    >
                        <CreditCard size={14} /> Encaisser
                    </button>
                ) : (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                        <CheckCircle2 size={12} />
                        Payé
                    </div>
                )}
                <ChevronRight size={18} className="text-gray-300 group-hover:text-studio-primary transition-colors" />
            </div>
        </div>
    );
}