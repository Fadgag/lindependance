"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Scissors, Users, LayoutDashboard, LogOut, BarChart2, Settings } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

const menuItems = [
    { name: 'Accueil', icon: CalendarDays, href: '/', adminOnly: false },
    { name: 'Agenda', icon: CalendarDays, href: '/agenda', adminOnly: false },
    { name: 'Clients', icon: Users, href: '/customers', adminOnly: false },
    { name: 'Statistiques', icon: BarChart2, href: '/dashboard', adminOnly: true },
    { name: 'Configuration', icon: Settings, href: '/settings', adminOnly: true },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    return (
        <aside className="w-72 bg-[var(--studio-bg)] border-r border-[var(--studio-border)] flex flex-col h-screen sticky top-0 px-6 py-8">

            {/* LOGO ELÉGANT */}
            <Link href="/" className="mb-12 px-4 block no-underline" aria-label="Accueil - Atelier">
                <h1 className="font-serif text-3xl tracking-tight text-[var(--studio-text)]">
                    Atelier<span className="text-[var(--studio-primary)]">.</span>
                </h1>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--studio-muted)] font-bold mt-1">
                    Studio Coiffure
                </p>
            </Link>

            {session?.user && (
                <div className="mb-6 px-4">
                    <div className="text-sm text-[var(--studio-muted)]">Connecté en tant que</div>
                    <div className="font-bold text-[var(--studio-text)]">{session.user.name || session.user.email}</div>
                </div>
            )}

            {/* NAVIGATION MODULES */}
            <nav className="space-y-2 flex-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    // if adminOnly and user is not admin, skip
                    if (item.adminOnly) {
                        const user = session?.user as Record<string, unknown> | undefined
                        if (!user || typeof user.role !== 'string' || user.role !== 'ADMIN') return null
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group ${
                                isActive
                                    ? 'bg-white text-[var(--studio-text)] shadow-sm border border-[var(--studio-border)]'
                                    : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-white/50'
                            }`}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-[var(--studio-primary)]' : ''} />
                            <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="flex items-center gap-3 px-6 py-6 mt-4 text-[var(--studio-muted)] hover:text-red-400 transition-colors">
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Quitter</span>
            </button>
        </aside>
    )
}