import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "VitaForge — Admin",
  description: "VitaForge platform administration.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0C10" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('vf_theme')||'light';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
