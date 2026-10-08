import type { ReactNode } from 'react';
import { LogoutButton } from './LogoutButton';
import { NavLinks } from './NavLinks';

export function AppShell({ children, email, unreadAlerts = 0 }: { children: ReactNode; email: string | null; unreadAlerts?: number }) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 text-sm font-semibold">RDL Self Publishing</div>
        <NavLinks unreadAlerts={unreadAlerts} />
        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="truncate">{email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
