import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'AZULERP - ERP Maroc & Gestion Commerciale Casablanca 2026',
  description: 'Système moderne de gestion commerciale, factures, bons de livraison (BL), devis, achats, comptabilité marocaine PCGM, fabrication et paie.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AZULERP',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased select-none">
        <Script src="/sql-asm.js" strategy="beforeInteractive" />
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Verde Orto PWA Service Worker registered:', registration.scope);
                    },
                    function(err) {
                      console.log('Verde Orto PWA Service Worker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}

