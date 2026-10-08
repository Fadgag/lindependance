"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { menuItems } from './menuItems'
import { useSession } from 'next-auth/react'
import { IssueReportMenuButton } from '@/components/issue-reports/IssueReportLauncher'

export default function MobileNav({ onIssueReportOpen }: { onIssueReportOpen?: () => void } = {}) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const isTechAdmin = session?.user?.role === 'TECH_ADMIN'

    return (
        <nav data-testid="mobile-nav" className="space-y-2 px-4 py-4">
            {menuItems.map((item) => {
                const isActive = pathname === item.href
                if (item.techAdminOnly && !isTechAdmin) return null
                if (isTechAdmin && !item.techAdminOnly) return null
                if (item.adminOnly) {
                    if (!session?.user || session.user.role !== 'ADMIN') return null
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white text-[var(--studio-text)]' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
                        data-testid={`nav-link-${item.href.replace('/', '') || 'home'}`}
                    >
                        <item.icon size={18} />
                        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                    </Link>
                )
            })}
            <IssueReportMenuButton onOpen={onIssueReportOpen} />
        </nav>
    )
}
