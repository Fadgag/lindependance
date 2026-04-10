import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { Home, CalendarDays, Users, BarChart2, Settings } from 'lucide-react'

export type MenuItem = {
    name: string
    icon: ComponentType<LucideProps>
    href: string
    adminOnly: boolean
}

export const menuItems: MenuItem[] = [
    { name: 'Accueil', icon: Home, href: '/', adminOnly: false },
    { name: 'Agenda', icon: CalendarDays, href: '/agenda', adminOnly: false },
    { name: 'Clients', icon: Users, href: '/customers', adminOnly: false },
    { name: 'Statistiques', icon: BarChart2, href: '/dashboard', adminOnly: true },
    { name: 'Configuration', icon: Settings, href: '/settings', adminOnly: true },
]



