import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Hanken Grotesk — a warm, plain-spoken humanist sans. No airs. It carries both
// the mind's voice and the few interface words.
const ui = localFont({
  src: [
    { path: "../public/fonts/Hanken-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Hanken-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "machinera",
  description: "A newly-born mind, raised by you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
