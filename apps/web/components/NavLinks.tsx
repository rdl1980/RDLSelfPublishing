'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string; match?: string; badgeKey?: 'alerts' }[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/keyword', label: 'Keyword' },
  { href: '/deep-view', label: 'Deep View' },
  { href: '/reverse-asin', label: 'Reverse ASIN' },
  { href: '/tracking/keyword', label: 'Tracking', match: '/tracking' },
  { href: '/avvisi', label: 'Avvisi', badgeKey: 'alerts' },
  { href: '/nicchie', label: 'Nicchie' },
  { href: '/calcolatori/bsr', label: 'Calcolatori', match: '/calcolatori' },
  { href: '/job', label: 'Job' },
  { href: '/impostazioni', label: 'Impostazioni' },
];

export function NavLinks({ unreadAlerts = 0 }: { unreadAlerts?: number }) {
  const path = usePathname();
  return (
    <nav className="space-y-1 text-sm">
      {NAV.map((n) => {
        const active = n.href === '/' ? path === '/' : path.startsWith(n.match ?? n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center justify-between rounded px-2 py-1 ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <span>{n.label}</span>
            {n.badgeKey === 'alerts' && unreadAlerts > 0 && (
              <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white text-slate-900' : 'bg-amber-500 text-white'}`}>{unreadAlerts}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
