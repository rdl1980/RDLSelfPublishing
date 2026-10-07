import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from './LogoutButton';

const NAV: { href: string; label: string }[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/keyword', label: 'Keyword' },
  { href: '/deep-view', label: 'Deep View' },
  { href: '/reverse-asin', label: 'Reverse ASIN' },
  { href: '/tracking/keyword', label: 'Tracking' },
  { href: '/nicchie', label: 'Nicchie' },
  { href: '/calcolatori/bsr', label: 'Calcolatori' },
  { href: '/job', label: 'Job' },
  { href: '/impostazioni', label: 'Impostazioni' },
];

export function AppShell({ children, email, title }: { children: ReactNode; email: string | null; title: string }) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 text-sm font-semibold">RDL Self Publishing</div>
        <nav className="space-y-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded px-2 py-1 text-slate-700 hover:bg-slate-100">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="truncate">{email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
