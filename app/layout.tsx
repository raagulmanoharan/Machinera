import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Inter closely matches SF Pro and is the cross-platform fallback. On Apple
// devices the CSS stack prefers real SF Pro via -apple-system; everywhere else
// (and in screenshots) this renders the SF-like look.
const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Inter-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "machinera",
  description: "A newly-born mind, raised by you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
