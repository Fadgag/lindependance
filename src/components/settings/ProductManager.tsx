"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Package, Euro, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Product } from '@/types/models'
import type { ProductIconName } from '@/schemas/products'

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
  iconName: ProductIconName
}

const emptyForm: FormData = { name: '', priceTTC: 0, taxRate: 20, stock: 0, iconName: 'Package' }

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

  const fetchProducts = async () => {
    const res = await fetch('/api/products', { credentials: 'include' })
    if (res.ok) setProducts(await res.json())
  }

  useEffect(() => { void fetchProducts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/products?id=${isEditing}` : '/api/products'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setFormData(emptyForm)
        setIsEditing(null)
        void fetchProducts()
      }
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
      iconName: (product.iconName as ProductIconName) ?? 'Package',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setIsEditing(null); setFormData(emptyForm) }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) void fetchProducts()
  }

  const priceHT = (priceTTC: number, taxRate: number) =>
    taxRate === 0 ? priceTTC : (priceTTC / (1 + taxRate / 100)).toFixed(2)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>

          {formData.taxRate > 0 && (
            <div className="flex items-end">
              <p className="text-sm text-slate-500">
                Prix HT : <span className="font-medium text-slate-700">{priceHT(formData.priceTTC, formData.taxRate)} €</span>
              </p>
            </div>
          )}

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

          return filtered.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
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
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-right mr-2">
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {product.stock}
                  </div>
                </div>
                <button onClick={() => startEdit(product)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        })()}
      </div>
    </div>
  )
}






