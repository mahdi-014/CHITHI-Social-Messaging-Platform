import type { Metadata } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '../components/theme-provider';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = {
  title: 'CHITHI — Social Messaging Platform',
  description: 'Connect with Friends. Chat Freely. Share Your Moments.',
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
