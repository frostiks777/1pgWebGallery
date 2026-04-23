import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Photo Gallery - WebDAV Cloud Photos",
  description: "Beautiful photo gallery with WebDAV cloud integration. View your photos in stunning collage layouts.",
  keywords: ["Photo Gallery", "WebDAV", "Cloud Photos", "Collage", "Next.js"],
  authors: [{ name: "Photo Gallery" }],
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <head>
        {/* Theme: obsidian:theme + data-theme; migrate legacy `theme` key */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=document.documentElement;var th=localStorage.getItem('obsidian:theme')||localStorage.getItem('theme');if(!th)th=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';d.setAttribute('data-theme',th==='dark'?'dark':'light');if(th==='dark')d.classList.add('dark');else d.classList.remove('dark');}catch(e){}})();` }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
