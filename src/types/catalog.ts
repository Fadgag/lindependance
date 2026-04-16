export type CatalogItem = {
  id: string
  type: 'SERVICE' | 'PRODUCT'
  name: string
  priceTTC?: number
  price?: number
  durationMinutes?: number
  stock?: number
  iconName?: string
  color?: string | null
}

