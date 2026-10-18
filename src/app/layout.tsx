import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Forge · Gym Tracker",
  description: "Train, registreer en zie je progressie. Snel, offline en zonder gedoe.",
  manifest: "/manifest.webmanifest",
  applicationName: "Forge",
  appleWebApp: { capable: true, title: "Forge", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f0" },
  ],
};

// Zet het thema vóór de eerste paint om flitsen te voorkomen.
const themeScript = `try{var t=localStorage.getItem('forge-theme')||'dark';if(t==='system'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
