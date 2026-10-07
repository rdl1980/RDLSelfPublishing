function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variabile d'ambiente mancante: ${name} (vedi .env.example)`);
  return v;
}

export const supabaseUrl = () => required('NEXT_PUBLIC_SUPABASE_URL');
export const supabasePublishableKey = () => required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
export const supabaseSecretKey = () => required('SUPABASE_SECRET_KEY');
