import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Tournament Dashboard",
  description: "Self-managing poker tournament clock, seating and payouts",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
