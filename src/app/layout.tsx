import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeutschMeister - High-Frequency German Learning',
  description: 'Master German A1, A2, B1, B2 high-frequency vocabulary with 5-sentence flashcards, verb conjugations, AI reading passages, hover dictionary, and real-time speaking exercises.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-cream-50 text-charcoal-900 selection:bg-gold-500/20 selection:text-gold-700">
        {children}
      </body>
    </html>
  );
}
