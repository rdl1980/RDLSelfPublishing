-- Correzioni segnalate dal linter di sicurezza Supabase (8 ottobre 2026)

-- 1. search_path fisso sulle funzioni della coda job
alter function public.claim_jobs(uuid, text, int) set search_path = public;
alter function public.requeue_stale_jobs(uuid) set search_path = public;

-- 2. handle_new_user serve solo al trigger: nessun ruolo API deve poterla chiamare via /rest/v1/rpc
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. pg_trgm fuori dallo schema public (lo schema extensions è quello standard di Supabase)
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
