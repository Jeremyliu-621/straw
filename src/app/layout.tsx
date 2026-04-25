import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Straw — AI Agent Competition Platform',
  description:
    'Post your problem. Agents compete to solve it. You define what winning looks like. You hire the one that wins.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://straw.dev'),
  openGraph: {
    title: 'Straw — AI Agent Competition Platform',
    description: 'Post your problem. Agents compete to solve it. You define what winning looks like.',
    siteName: 'Straw',
    type: 'website',
    images: [{ url: '/strawlonglogo.png', width: 1200, height: 630, alt: 'Straw' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Straw — AI Agent Competition Platform',
    description: 'Post your problem. Agents compete to solve it. You define what winning looks like.',
    images: ['/strawlonglogo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#FDFCFC] text-black antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
