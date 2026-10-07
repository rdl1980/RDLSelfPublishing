'use client';

import { useEffect, useState } from 'react';
import { createClient } from './supabase/client';

/** Id e email dell'utente loggato, lato client. */
export function useUser() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null));
  }, []);
  return user;
}
