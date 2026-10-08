import Image from 'next/image';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/';
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Image src="/logo.png" alt="RDL Self Publishing" width={96} height={96} className="mx-auto mb-4 rounded-2xl" priority />
        <h1 className="mb-1 text-center text-xl font-semibold">RDL Self Publishing</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Accedi con l&apos;utente creato su Supabase.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
