import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intellicor CRM | Sales Pipeline & Lead Intelligence',
  description:
    'Lightweight sales funnel CRM for Intellicor Technologies: websites, Google Business Profile optimization, and social media marketing.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
