"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { motion, useDragControls, AnimatePresence } from "framer-motion"
import { X, GripHorizontal } from "lucide-react"

interface BaseModalProps {
    isOpen: boolean
    onClose: () => void
    title?: React.ReactNode
    children?: React.ReactNode
    maxWidth?: string
}

export default function BaseModal({ isOpen, onClose, title, children, maxWidth = "32rem" }: BaseModalProps) {
    const dragControls = useDragControls()

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog.Root open={isOpen} onOpenChange={onClose}>
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: "fixed",
                                    inset: 0,
                                    backgroundColor: "rgba(0,0,0,0.4)",
                                    backdropFilter: "blur(4px)",
                                    zIndex: 9998
                                }}
                            />
                        </Dialog.Overlay>

                        <Dialog.Content forceMount asChild>
                            <div style={{
                                position: "fixed",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 9999,
                                pointerEvents: "none"
                            }}>
                                <motion.div
                                    drag
                                    dragControls={dragControls}
                                    dragListener={false}
                                    dragMomentum={false}
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    style={{
                                        backgroundColor: "#FFFFFF",
                                        width: "90%",
                                        maxWidth: maxWidth,
                                        borderRadius: "2.5rem",
                                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                                        overflow: "hidden",
                                        pointerEvents: "auto"
                                    }}
                                >
                                    {/* HEADER */}
                                    <div style={{
                                        backgroundColor: "#514443",
                                        margin: "12px",
                                        borderRadius: "2rem",
                                        height: "110px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        position: "relative",
                                        color: "white"
                                    }}>
                                        <div
                                            onPointerDown={(e) => dragControls.start(e)}
                                            style={{ position: "absolute", top: "10px", cursor: "grab", opacity: 0.3 }}
                                        >
                                            <GripHorizontal size={20} />
                                        </div>

                                        {/* Utilisation du composant Title de Radix pour enlever le warning */}
                                        <Dialog.Title style={{
                                            fontSize: "1.7rem",
                                            fontStyle: "italic",
                                            fontWeight: "300",
                                            fontFamily: "var(--font-serif)",
                                            margin: 0
                                        }}>
                                            {title}
                                        </Dialog.Title>

                                        {/* Description invisible pour l'accessibilité (enlève le 2ème warning) */}
                                        <Dialog.Description style={{ display: 'none' }}>
                                            Formulaire pour {title}
                                        </Dialog.Description>

                                        <button
                                            aria-label="Fermer"
                                            onClick={onClose}
                                            style={{
                                                position: "absolute", top: "15px", right: "20px",
                                                background: "rgba(255,255,255,0.1)", border: "none",
                                                borderRadius: "50%", padding: "8px", cursor: "pointer", color: "white"
                                            }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* CORPS */}
                                    <div style={{ padding: "20px 40px 40px", backgroundColor: "#FFFFFF" }}>
                                        {children}
                                    </div>
                                </motion.div>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </AnimatePresence>
    )
}