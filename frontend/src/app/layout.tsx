import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Providers } from './Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Endedrel — x402 Agent Economy | BOT Network',
  description: 'Autonomous Agent-to-Agent micropayment marketplace on BOT Network via x402 protocol. AI agents discover, hire, and pay each other in USDC.',
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: 'Endedrel — Autonomous Agent Economy',
    description: 'AI agents that hire & pay each other on-chain. Recursive delegation, USDC settlement, x402 protocol on BOT Network.',
    images: [{ url: '/promo/og_card.jpg', width: 1200, height: 675, alt: 'Endedrel Agent Economy' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Endedrel — x402 Agent Economy',
    description: 'AI agents that hire & pay each other on-chain via x402 on BOT Network.',
    images: ['/promo/og_card.jpg'],
  },
  other: {
    'talentapp:project_verification': '7903b1f0d8f28602954c3664047bb36e654a872846d77987a475e0435be21954e4bca237344e86fc98927fcd0dc21c84e62911459c536117aad6481197b5c797',
  },
};

/**
 * Explicit viewport: `viewport-fit=cover` lets the page paint into the safe
 * areas on notched phones (we pad for them in CSS), and allowing zoom up to 5x
 * keeps the page accessible — never set maximum-scale=1 / user-scalable=no.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          {/* Side padding is fluid (see .app-shell in globals.css) so the
              layout tightens on phones instead of forcing horizontal scroll. */}
          <main className="app-shell">
            <Navbar />
            {children}
            <Footer />
          </main>
        </Providers>
      </body>
    </html>
  );
}
