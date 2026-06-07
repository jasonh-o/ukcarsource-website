'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  Settings,
  TrendingUp,
  Globe,
  Sparkles,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
  { href: '/outreach', icon: Send, label: 'Outreach' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/markets', icon: Globe, label: 'Markets' },
  { href: '/ai', icon: Sparkles, label: 'AI Tools' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="px-5 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-orange-500 rounded-sm" />
          <div>
            <p className="text-xs font-bold text-white tracking-widest uppercase">UK Car Source</p>
            <p className="text-[10px] text-neutral-500 tracking-wider uppercase">CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              path.startsWith(href)
                ? 'bg-orange-500/10 text-orange-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-neutral-800">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider">ukcarsource.com</p>
      </div>
    </aside>
  )
}
