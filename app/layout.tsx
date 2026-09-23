import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import ConfirmHost from "@/components/ConfirmHost";
import { DEFAULT_THEME, themeBootScript, themeColorFor } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokerClock",
  description:
    "Self-managing poker dashboard for tournaments and cash games.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: themeColorFor(DEFAULT_THEME),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ConfirmHost />
      </body>
    </html>
  );
}
