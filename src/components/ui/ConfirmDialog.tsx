"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import React from "react"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Variant visuel du bouton de confirmation */
  variant?: "danger" | "warning"
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dialogue de confirmation réutilisable — remplace window.confirm().
 * Accessible (Radix Dialog), thémé, compatible tests Playwright.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBg = variant === "danger" ? "#EF4444" : "#F59E0B"

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(2px)",
                  zIndex: 9999,
                }}
              />
            </Dialog.Overlay>

            <Dialog.Content forceMount asChild>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10000,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-sm p-6 flex flex-col gap-4"
                >
                  {/* Icône + titre */}
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: variant === "danger" ? "#FEE2E2" : "#FEF3C7" }}
                    >
                      <AlertTriangle
                        size={18}
                        style={{ color: confirmBg }}
                      />
                    </div>
                    <Dialog.Title className="text-base font-bold text-slate-800 leading-tight">
                      {title}
                    </Dialog.Title>
                    {/* Description invisible pour l'accessibilité (WCAG 2.1 / Radix) */}
                    <Dialog.Description className="sr-only">
                      {message ?? title}
                    </Dialog.Description>
                  </div>

                  {message && (
                    <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                  )}

                  {/* Boutons */}
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="button"
                      onClick={onConfirm}
                      className="px-5 py-2 text-sm font-bold text-white rounded-full shadow transition-opacity hover:opacity-90"
                      style={{ backgroundColor: confirmBg }}
                    >
                      {confirmLabel}
                    </button>
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



