import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { SiteFooter } from "@/components/site/site-footer";
import { ThemeColorsProvider } from "@/components/theme-colors-provider";
import { TransactionsProvider } from "@/components/finance/transactions-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CapturedItemsProvider } from "@/lib/captured-items";
import { SITE_PRODUCT } from "@/lib/site/product";

import "./globals.css";

function siteMetadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) return new URL(raw);
  return undefined;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_PRODUCT.name,
    template: `%s — ${SITE_PRODUCT.name}`,
  },
  description: SITE_PRODUCT.description,
  applicationName: SITE_PRODUCT.name,
  ...(siteMetadataBase() ? { metadataBase: siteMetadataBase() } : {}),
  openGraph: {
    title: SITE_PRODUCT.name,
    description: SITE_PRODUCT.ogDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_PRODUCT.name,
    description: SITE_PRODUCT.ogDescription,
  },
  appleWebApp: {
    capable: true,
    title: SITE_PRODUCT.shortName,
    statusBarStyle: "default",
  },
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark =
      t === 'dark' ||
      (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <ThemeColorsProvider>
            <ToastProvider>
              <TransactionsProvider>
                <CapturedItemsProvider>
                  <div className="flex min-h-full flex-col">
                    {children}
                    <SiteFooter />
                  </div>
                </CapturedItemsProvider>
              </TransactionsProvider>
            </ToastProvider>
          </ThemeColorsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
