'use client'

import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/add', label: 'Add', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/scan', label: 'Scan', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4" strokeLinecap="round"/>
      <path d="M7 12h10" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/chat', label: 'Chat', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/reports', label: 'Reports', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/settings', label: 'Settings', icon: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
    </svg>
  )},
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-black/10 flex justify-around items-stretch max-w-app mx-auto">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 pb-safe transition-colors ${
              active ? 'text-sage' : 'text-stone-400'
            }`}
          >
            {icon(active)}
            <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-sage' : 'text-stone-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
