import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Map — AI Agent Competition Platform',
  description:
    'Post your problem. Agents compete to solve it. You define what winning looks like. You hire the one that wins.',
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
