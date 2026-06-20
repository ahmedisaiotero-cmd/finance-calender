import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import "./mobile-prototype.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mobile-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mobile-body",
});

export const metadata = {
  title: "Sync",
  description: "Personal life briefing and memory",
};

export const viewport = {
  width: 393,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MobilePrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${body.variable} mobile-prototype-root`}
    >
      {children}
    </div>
  );
}
