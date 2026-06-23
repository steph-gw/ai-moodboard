import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display, Spectral } from 'next/font/google';
import '@/styles/app.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-body-serif',
});

export const metadata: Metadata = {
  title: 'GatherWise — AI Moodboard',
  description: 'Collaborative wedding moodboard for planners and clients',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable} ${spectral.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
