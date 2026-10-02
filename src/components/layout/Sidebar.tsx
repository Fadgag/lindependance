"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { menuItems } from './menuItems'

export default function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const isTechAdmin = session?.user?.role === 'TECH_ADMIN'

    if (pathname.startsWith('/portail/') || pathname.startsWith('/retour-test/')) return null

    return (
        /* hidden md:flex = display:none on mobile → removed from a11y tree. MobileHeader/MobileSheet handle nav on small devices. */
        <aside className="hidden md:flex w-72 bg-(--studio-bg) border-r border-(--studio-border) flex-col h-screen sticky top-0 px-6 py-8">

            {/* LOGO ELÉGANT */}
            <Link href="/" className="mb-12 px-4 block no-underline" aria-label="Accueil - Atelier">
                <h1 className="font-serif text-3xl tracking-tight text-(--studio-text)">
                    Atelier<span className="text-(--studio-primary)">.</span>
                </h1>
                <p className="text-[10px] tracking-[0.3em] uppercase text-(--studio-muted) font-bold mt-1">
                    Studio Coiffure
                </p>
            </Link>

            {session?.user && (
                <div className="mb-6 px-4">
                    <div className="text-sm text-(--studio-muted)">Connecté en tant que</div>
                    <div className="font-bold text-(--studio-text)">{session.user.name || session.user.email}</div>
                </div>
            )}

            {/* NAVIGATION MODULES */}
            <nav className="space-y-2 flex-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    if (item.techAdminOnly && !isTechAdmin) return null
                    if (isTechAdmin && !item.techAdminOnly) return null
                    if (item.adminOnly && session?.user?.role !== 'ADMIN') return null

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group ${
                                isActive
                                    ? 'bg-white text-(--studio-text) shadow-sm border border-(--studio-border)'
                                    : 'text-(--studio-muted) hover:text-(--studio-text) hover:bg-white/50'
                            }`}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-(--studio-primary)' : ''} />
                            <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="flex items-center gap-3 px-6 py-6 mt-4 text-(--studio-muted) hover:text-red-400 transition-colors">
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Quitter</span>
            </button>
        </aside>
    )
}