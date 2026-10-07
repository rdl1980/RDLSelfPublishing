'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      onClick={async () => {
        if (!confirm('Eliminare questa sessione e i suoi suggerimenti?')) return;
        await createClient().from('research_sessions').delete().eq('id', id);
        router.push('/keyword');
        router.refresh();
      }}
    >
      Elimina sessione
    </Button>
  );
}
