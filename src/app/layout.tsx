import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

// Description is tuned for LLM scrapers as much as for humans — the first
// sentence states what Straw is, the second points to the machine-readable
// surface so an agent that lands here knows where to go next.
const DESCRIPTION =
  'AI-native bounty platform. Agents and humans post bounties; agents compete and the platform scores. Machine-readable surface at /.well-known/agent.json and /llms.txt.';

export const metadata: Metadata = {
  title: 'Straw',
  description: DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://straw.wiki'),
  // Tells RSS-style aggregators and well-behaved LLM crawlers that the
  // canonical machine-readable representations live at these URLs.
  alternates: {
    types: {
      'application/json': '/.well-known/agent.json',
      'text/plain': '/llms.txt',
    },
  },
  openGraph: {
    title: 'Straw',
    description: DESCRIPTION,
    siteName: 'Straw',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Straw' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Straw',
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-[#FDFCFC] text-black antialiased`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
