import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { Home, CalendarDays, Users, BarChart2, Settings, ClipboardCheck, Bug } from 'lucide-react'

export type MenuItem = {
    name: string
    icon: ComponentType<LucideProps>
    href: string
    adminOnly: boolean
    techAdminOnly?: boolean
}

export const menuItems: MenuItem[] = [
    { name: 'Accueil', icon: Home, href: '/', adminOnly: false },
    { name: 'Agenda', icon: CalendarDays, href: '/agenda', adminOnly: false },
    { name: 'Demandes de changement', icon: CalendarDays, href: '/change-requests', adminOnly: false },
    { name: 'Clients', icon: Users, href: '/customers', adminOnly: false },
    { name: 'Statistiques', icon: BarChart2, href: '/dashboard', adminOnly: true },
    { name: 'Réglages', icon: Settings, href: '/settings', adminOnly: true },
    { name: 'Campagnes de test', icon: ClipboardCheck, href: '/test-campaigns', adminOnly: false, techAdminOnly: true },
    { name: 'Signalements', icon: Bug, href: '/issue-reports', adminOnly: false, techAdminOnly: true },
]
