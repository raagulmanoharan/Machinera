import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Machinera",
  description: "Raise a newly-born mind that genuinely learns the world from you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
