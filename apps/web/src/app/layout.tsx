import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/instrument-sans';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = { title: { default: 'Workshop Desk', template: '%s · Workshop Desk' }, description: 'Workshop scheduling and registration for the training centre' };
export const viewport: Viewport = { themeColor: '#1f2e5a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only z-[100] rounded-md bg-white px-3 py-2 text-sm font-medium text-navy-800 shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
