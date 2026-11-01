import type { Metadata } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '../components/theme-provider';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'CHITHI — Social Messaging Platform',
    template: '%s | CHITHI',
  },
  description: 'Connect with Friends. Chat Freely. Share Your Moments. Private messaging, HD WebRTC calling, and real-time moments.',
  applicationName: 'CHITHI',
  authors: [{ name: 'CHITHI Team' }],
  keywords: ['CHITHI', 'Social Messaging', 'Chat', 'Private Messenger', 'Voice Call', 'Video Call', 'Moments', 'WebRTC'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/brand/app-icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/brand/favicon/favicon.svg',
        color: '#19C6C5',
      },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chithi.app',
    siteName: 'CHITHI',
    title: 'CHITHI — Social Messaging Platform',
    description: 'Connect with Friends. Chat Freely. Share Your Moments. Private messaging, HD WebRTC calling, and real-time moments.',
    images: [
      {
        url: '/brand/social/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CHITHI Social Messaging Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CHITHI — Social Messaging Platform',
    description: 'Connect with Friends. Chat Freely. Share Your Moments. Private messaging, HD WebRTC calling, and real-time moments.',
    images: ['/brand/social/og-image.png'],
    creator: '@chithiapp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
