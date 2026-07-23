import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Instrument Serif — airy, literary, tender. The mind's voice.
const serif = localFont({
  src: [
    { path: "../public/fonts/InstrumentSerif-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/InstrumentSerif-400i.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

// Hanken Grotesk — a warm humanist sans for the few quiet interface words.
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
    <html lang="en" className={`${serif.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
