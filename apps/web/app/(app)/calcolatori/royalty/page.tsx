import Link from 'next/link';
import { RoyaltyCalculator } from '@/components/calcolatori/RoyaltyCalculator';
import { PageTitle } from '@/components/ui';

export default function RoyaltyPage() {
  return (
    <>
      <PageTitle actions={<Link href="/calcolatori/bsr" className="text-sm underline">← Calcolatore BSR</Link>}>Calcolatore royalty KDP</PageTitle>
      <RoyaltyCalculator />
    </>
  );
}
