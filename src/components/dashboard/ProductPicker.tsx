"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Package, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Product } from "@/types/models";

// --- Icônes produit ---
const ICON_MAP: Record<string, LucideIcon> = {
  Package, Droplet, Sparkles, Scissors, FlaskConical, Wind, Heart, Star,
};
function ProductIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon size={13} />;
}

// --- Types ---
interface ProductPickerProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

const RECENT_KEY = "recent_products";
const MAX_RECENT = 8;

function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

// --- Composant ---
export default function ProductPicker({ products, onSelect, onClose }: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // RAISON: initialisation lazy depuis localStorage pour éviter le setState synchrone dans useEffect
  const [recentIds, setRecentIds] = useState<string[]>(loadRecentIds);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus auto à l'ouverture
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounce recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { recentProducts, filteredResults } = useMemo(() => {
    const recent = recentIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));

    // Masquer les récents quand une recherche est active (UX: évite la redondance)
    const showRecent = !debouncedQuery;

    const others = products.filter((p) => !recentIds.includes(p.id));
    const results = debouncedQuery
      ? products.filter((p) => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
      : others;

    return { recentProducts: showRecent ? recent : [], filteredResults: results };
  }, [recentIds, products, debouncedQuery]);

  const handleSelect = useCallback((product: Product) => {
    // Mettre à jour les récents dans localStorage
    try {
      setRecentIds((prev) => {
        const next = [product.id, ...prev.filter((id) => id !== product.id)].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    } catch { /* silent */ }
    onSelect(product);
  }, [onSelect]);

  const renderRow = (p: Product) => (
    <button
      key={p.id}
      role="option"
      aria-selected={false}
      onClick={() => handleSelect(p)}
      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors rounded-xl"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500 shrink-0">
        <ProductIcon name={p.iconName} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
        <p className="text-[10px] text-gray-400">{p.priceTTC.toFixed(2)} €</p>
      </div>
    </button>
  );

  return (
    <div
      role="listbox"
      aria-label="Sélectionner un produit"
      className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl w-72 max-h-72 overflow-hidden flex flex-col"
    >
      {/* Champ de recherche */}
      <div className="p-2 border-b border-gray-50">
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          aria-label="Rechercher un produit"
          className="w-full p-2 text-sm border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500/30"
        />
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Section Populaires (masquée si recherche active) */}
        {recentProducts.length > 0 && (
          <div className="px-2 py-2 border-b border-gray-50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
              Populaires
            </p>
            {recentProducts.map(renderRow)}
          </div>
        )}

        {/* Résultats */}
        <div className="p-2">
          {filteredResults.length > 0
            ? filteredResults.map(renderRow)
            : <p className="p-4 text-xs text-gray-400 text-center">Aucun produit trouvé</p>
          }
        </div>
      </div>
    </div>
  );
}




