'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="mt-1 text-slate-500 underline hover:text-slate-800"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
    >
      Esci
    </button>
  );
}
