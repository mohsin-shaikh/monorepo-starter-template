import { Geist, Geist_Mono } from 'next/font/google';

import '@pkg/ui/globals.css';
import { Providers } from './providers';
import { ActiveThemeProvider } from '@/components/active-theme';
import { cookies } from 'next/headers';
import { cn } from '@pkg/ui/lib/utils';
import { NuqsAdapter } from 'nuqs/adapters/next';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const cookieStore = await cookies()
  const activeThemeValue = cookieStore.get("active_theme")?.value
  const isScaled = activeThemeValue?.endsWith("-scaled")

  const { locale } = await params;

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
      <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={
          cn(`${fontSans.variable} ${fontMono.variable} font-sans antialiased`,
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          isScaled ? "theme-scaled" : "",
          // fontVariables
        )}
      >
        <Providers locale={locale}>
          <ActiveThemeProvider initialTheme={activeThemeValue}>
            <NuqsAdapter>
              {children}
            </NuqsAdapter>
          </ActiveThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
