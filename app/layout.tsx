import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeColorsProvider } from "@/components/theme-colors-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Calendar",
  description: "A modern finance dashboard for spending and transactions",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <ThemeColorsProvider>{children}</ThemeColorsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
