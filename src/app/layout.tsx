import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'ColiSN Admin',
  description: 'Dashboard administrateur — ColiSN, covoiturage de colis au Sénégal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#1f2937', color: '#f9fafb' },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
