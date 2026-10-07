import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RDL Self Publishing',
  description: 'Ricerca di mercato e tracking per autori KDP su Amazon.it',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
