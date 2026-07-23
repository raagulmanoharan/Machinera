import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Sora — a geometric sans for the voices; warm enough to be human, engineered
// enough to feel like it lives inside a machine.
const sora = localFont({
  src: [
    { path: "../public/fonts/Sora-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Sora-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Sora-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

// IBM Plex Mono — the "device" layer: status bar, meta, timestamps. The machine
// framing the mind.
const mono = localFont({
  src: [
    { path: "../public/fonts/PlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/PlexMono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "machinera",
  description: "A newly-born mind, raised by you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
