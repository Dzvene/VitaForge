import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VitaForge — calorie & macro tracker",
  description:
    "Calibration-first nutrition tracking. No ads, no paywall. Measure your real maintenance, then build the cut from facts.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0C10" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint (no light/dark flash). Light is the
// default — the `.dark` class only gets added when the user chose dark (or
// system + the OS is dark).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('vf_theme')||'light';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
