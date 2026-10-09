"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Package, Euro, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star, History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Product, ProductStockMovement } from '@/types/models'
import { ProductStockMovementListSchema, type ProductIconName } from '@/schemas/products'
import { isAtOrBelowStockMinimum, MAX_STOCK_QUANTITY } from '@/domain/stock/policies'

const ICON_OPTIONS: { name: ProductIconName; label: string; icon: LucideIcon }[] = [
  { name: 'Package',      label: 'Produit',    icon: Package },
  { name: 'Droplet',      label: 'Soin',       icon: Droplet },
  { name: 'Sparkles',     label: 'Finition',   icon: Sparkles },
  { name: 'Scissors',     label: 'Coiffure',   icon: Scissors },
  { name: 'FlaskConical', label: 'Technique',  icon: FlaskConical },
  { name: 'Wind',         label: 'Brushing',   icon: Wind },
  { name: 'Heart',        label: 'Beauté',     icon: Heart },
  { name: 'Star',         label: 'Premium',    icon: Star },
]

const TAX_RATES = [
  { label: '0%', value: 0 },
  { label: '5.5%', value: 5.5 },
  { label: '10%', value: 10 },
  { label: '20%', value: 20 },
]

type FormData = {
  name: string
  priceTTC: number
  taxRate: number
  stock: number
  stockMinimum: number
  iconName: ProductIconName
}

type StockMovementType = 'RECEIPT' | 'ADJUSTMENT'

const emptyForm: FormData = { name: '', priceTTC: 0, taxRate: 20, stock: 0, stockMinimum: 0, iconName: 'Package' }
const movementLabels: Record<ProductStockMovement['type'], string> = {
  INITIAL: 'Stock initial',
  RECEIPT: 'Entrée',
  ADJUSTMENT: 'Ajustement',
  SALE: 'Vente',
}

function ProductIcon({ name, size = 16 }: { name: string; size?: number }) {
  const found = ICON_OPTIONS.find((o) => o.name === name)
  const Icon = found?.icon ?? Package
  return <Icon size={size} />
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [stockDialogProduct, setStockDialogProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState<StockMovementType>('RECEIPT')
  const [movementQuantity, setMovementQuantity] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [movementError, setMovementError] = useState('')
  const [isSavingMovement, setIsSavingMovement] = useState(false)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<ProductStockMovement[]>([])
  const [historyError, setHistoryError] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { credentials: 'include' })
      if (!res.ok) throw new Error('Impossible de charger les produits.')
      setProducts(await res.json())
      setPageError('')
    } catch {
      setPageError('Impossible de charger les produits. Réessayez.')
    }
  }

  useEffect(() => { void fetchProducts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError('')
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/products?id=${isEditing}` : '/api/products'
    const { stock, ...updateData } = formData
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(isEditing ? updateData : { ...formData, stock }),
      })
      if (!res.ok) {
        setFormError(res.status === 400 ? 'Vérifiez les informations saisies.' : 'Impossible d’enregistrer le produit.')
        return
      }
      setFormData(emptyForm)
      setIsEditing(null)
      await fetchProducts()
    } catch {
      setFormError('Impossible d’enregistrer le produit. Vérifiez votre connexion.')
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (product: Product) => {
    setIsEditing(product.id)
    setFormData({
      name: product.name,
      priceTTC: product.priceTTC,
      taxRate: product.taxRate,
      stock: product.stock,
      stockMinimum: product.stockMinimum,
      iconName: ICON_OPTIONS.find((option) => option.name === product.iconName)?.name ?? 'Package',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setIsEditing(null); setFormData(emptyForm); setFormError('') }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        setPageError('Impossible de supprimer le produit.')
        return
      }
      await fetchProducts()
    } catch {
      setPageError('Impossible de supprimer le produit. Vérifiez votre connexion.')
    }
  }

  const openStockDialog = (product: Product) => {
    setStockDialogProduct(product)
    setMovementType('RECEIPT')
    setMovementQuantity('')
    setMovementNote('')
    setMovementError('')
  }

  const handleStockMovement = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!stockDialogProduct) return
    const quantityDelta = Number(movementQuantity)
    if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0 || (movementType === 'RECEIPT' && quantityDelta < 0)) {
      setMovementError(movementType === 'RECEIPT'
        ? 'Saisissez une quantité positive.'
        : 'Saisissez un ajustement entier différent de zéro.')
      return
    }

    setIsSavingMovement(true)
    setMovementError('')
    try {
      const response = await fetch(`/api/products/${stockDialogProduct.id}/stock-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: movementType, quantityDelta, note: movementNote }),
      })
      if (!response.ok) {
        setMovementError(response.status === 409
          ? 'Vérifiez le stock disponible et la limite maximale autorisée.'
          : 'Impossible d’enregistrer le mouvement.')
        return
      }
      setStockDialogProduct(null)
      await fetchProducts()
    } catch {
      setMovementError('Impossible d’enregistrer le mouvement. Vérifiez votre connexion.')
    } finally {
      setIsSavingMovement(false)
    }
  }

  const openHistory = async (product: Product) => {
    setHistoryProduct(product)
    setMovements([])
    setHistoryError('')
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/products/${product.id}/stock-movements`, { credentials: 'include' })
      if (!response.ok) throw new Error('Impossible de charger l’historique.')
      const parsed = ProductStockMovementListSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error('Format d’historique invalide.')
      setMovements(parsed.data)
    } catch {
      setHistoryError('Impossible de charger l’historique du stock. Réessayez.')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const priceHT = (priceTTC: number, taxRate: number) =>
    taxRate === 0 ? priceTTC : (priceTTC / (1 + taxRate / 100)).toFixed(2)
  const lowStockCount = products.filter((product) =>
    isAtOrBelowStockMinimum(product.stock, product.stockMinimum),
  ).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {pageError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{pageError}</p>}
      {/* FORMULAIRE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {isEditing
              ? <><Edit2 size={20} className="text-amber-500" /> Modifier le produit</>
              : <><Plus size={20} className="text-rose-400" /> Ajouter un produit</>}
          </h2>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
                <X size={16} /> Annuler
              </button>
            )}
            <button type="button" onClick={() => setShowForm((v) => !v)} className="text-sm text-slate-500 px-3 py-1 rounded-md border">
              {showForm ? 'Réduire' : 'Déployer'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Icône */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Icône</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = formData.iconName === opt.name
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, iconName: opt.name }))}
                    title={opt.label}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all w-16 ${
                      isSelected
                        ? 'border-rose-400 bg-rose-50 text-rose-600'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] leading-tight text-center">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nom */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ex : Huile d'argan"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>

          {/* Prix TTC */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prix TTC (€) *</label>
            <div className="relative">
              <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.priceTTC}
                onChange={(e) => setFormData((f) => ({ ...f, priceTTC: parseFloat(e.target.value) || 0 }))}
                required
                className="w-full pl-8 p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
              />
            </div>
          </div>

          {/* TVA */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Taux de TVA *</label>
            <select
              value={formData.taxRate}
              onChange={(e) => setFormData((f) => ({ ...f, taxRate: parseFloat(e.target.value) }))}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
            >
              {TAX_RATES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock initial</label>
              <input
                type="number"
                min="0"
                max={MAX_STOCK_QUANTITY}
                step="1"
                value={formData.stock}
                onChange={(e) => setFormData((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seuil minimum</label>
            <input
              type="number"
              min="0"
              max={MAX_STOCK_QUANTITY}
              step="1"
              value={formData.stockMinimum}
              onChange={(e) => setFormData((f) => ({ ...f, stockMinimum: parseInt(e.target.value, 10) || 0 }))}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>

          {isEditing && (
            <p className="sm:col-span-2 text-sm text-slate-500">
              Pour modifier la quantité, utilisez les mouvements de stock dans la liste des produits.
            </p>
          )}

          {formData.taxRate > 0 && (
            <div className="flex items-end">
              <p className="text-sm text-slate-500">
                Prix HT : <span className="font-medium text-slate-700">{priceHT(formData.priceTTC, formData.taxRate)} €</span>
              </p>
            </div>
          )}

          {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{formError}</p>}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
        )}
      </div>

      {/* LISTE */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="sr-only">Rechercher un produit</label>
          <input
            aria-label="Rechercher un produit"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div className="flex items-center gap-2">
          {query && (
            <button onClick={() => setQuery('')} className="text-sm text-slate-500">Effacer</button>
          )}
          <button
            type="button"
            onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-sm"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600" role="status">
        {lowStockCount === 0
          ? 'Aucun produit à réapprovisionner.'
          : `${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} à réapprovisionner.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(() => {
          const q = query.trim().toLowerCase()
          const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
          if (filtered.length === 0) {
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-400 col-span-1 sm:col-span-2">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>Aucun produit trouvé</p>
              </div>
            )
          }

          return filtered.map((product) => {
            const isLowStock = isAtOrBelowStockMinimum(product.stock, product.stockMinimum)
            return (
            <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 group hover:border-rose-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-3 h-12 rounded-full bg-slate-100 text-slate-500">
                  {/* accent */}
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                    <ProductIcon name={product.iconName} size={18} />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800">{product.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                      <span className="text-sm text-slate-500">{product.priceTTC.toFixed(2)} €</span>
                      <span className="text-xs text-slate-400">{product.taxRate}% TVA</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        Stock : {product.stock}
                      </span>
                      <span className="text-slate-500">Seuil : {product.stockMinimum}</span>
                      {isLowStock && <span className="font-medium text-red-700">À réapprovisionner</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                <button
                  onClick={() => openStockDialog(product)}
                  aria-label={`Ajouter un mouvement de stock pour ${product.name}`}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => { void openHistory(product) }}
                  aria-label={`Voir l’historique du stock de ${product.name}`}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <History size={16} />
                </button>
                <button
                  onClick={() => startEdit(product)}
                  aria-label={`Modifier ${product.name}`}
                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => { void handleDelete(product.id) }}
                  aria-label={`Supprimer ${product.name}`}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )})
        })()}
      </div>

      {stockDialogProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="stock-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="stock-dialog-title" className="text-lg font-bold text-slate-800">Mouvement de stock</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {stockDialogProduct.name} — stock actuel : {stockDialogProduct.stock}
                </p>
              </div>
              <button type="button" onClick={() => setStockDialogProduct(null)} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleStockMovement} className="space-y-4">
              <div>
                <label htmlFor="movement-type" className="mb-1 block text-sm font-medium text-slate-700">Type de mouvement</label>
                <select
                  id="movement-type"
                  value={movementType}
                  onChange={(event) => {
                    const nextType = event.target.value
                    if (nextType === 'RECEIPT' || nextType === 'ADJUSTMENT') setMovementType(nextType)
                  }}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="RECEIPT">Entrée de stock</option>
                  <option value="ADJUSTMENT">Ajustement (+ ou -)</option>
                </select>
              </div>
              <div>
                <label htmlFor="movement-quantity" className="mb-1 block text-sm font-medium text-slate-700">
                  {movementType === 'RECEIPT' ? 'Quantité à ajouter' : 'Variation de stock (+ ou -)'}
                </label>
                <input
                  id="movement-quantity"
                  type="number"
                  step="1"
                  min={movementType === 'RECEIPT' ? 1 : -MAX_STOCK_QUANTITY}
                  max={MAX_STOCK_QUANTITY}
                  value={movementQuantity}
                  onChange={(event) => setMovementQuantity(event.target.value)}
                  required
                  className="w-full rounded-xl border p-3"
                />
              </div>
              <div>
                <label htmlFor="movement-note" className="mb-1 block text-sm font-medium text-slate-700">Note (facultative)</label>
                <input
                  id="movement-note"
                  type="text"
                  maxLength={250}
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>
              {movementError && <p role="alert" className="text-sm text-red-600">{movementError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStockDialogProduct(null)} className="rounded-xl border px-4 py-2 text-sm text-slate-600">
                  Annuler
                </button>
                <button type="submit" disabled={isSavingMovement} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {isSavingMovement ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="stock-history-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="stock-history-title" className="text-lg font-bold text-slate-800">Historique du stock</h2>
                <p className="mt-1 text-sm text-slate-500">{historyProduct.name}</p>
              </div>
              <button type="button" onClick={() => setHistoryProduct(null)} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {isLoadingHistory && <p className="text-sm text-slate-500">Chargement de l’historique...</p>}
            {historyError && <p role="alert" className="text-sm text-red-600">{historyError}</p>}
            {!isLoadingHistory && !historyError && movements.length === 0 && (
              <p className="text-sm text-slate-500">Aucun mouvement enregistré.</p>
            )}
            {!isLoadingHistory && movements.length > 0 && (
              <ul className="max-h-80 space-y-3 overflow-y-auto">
                {movements.map((movement) => (
                  <li key={movement.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <p className="font-medium text-slate-800">{movementLabels[movement.type]}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(movement.createdAt).toLocaleString('fr-FR')} · {movement.stockBefore} → {movement.stockAfter}
                      </p>
                      {movement.note && <p className="mt-1 text-xs text-slate-500">{movement.note}</p>}
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${movement.quantityDelta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {movement.quantityDelta > 0 ? '+' : ''}{movement.quantityDelta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

