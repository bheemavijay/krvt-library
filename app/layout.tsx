import type { Metadata } from "next";
import {
  Crimson_Text,
  Inter,
  Lora,
  Merriweather,
  Nunito,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

import { SiteShell } from "@/components/layout/site-shell";

export const metadata: Metadata = {
  title: "KRVT Library",
  description: "A premium personal novel library and reader experience.",
  manifest: "/manifest.json",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const crimson = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${merriweather.variable} ${lora.variable} ${crimson.variable} ${sourceSerif.variable} ${nunito.variable} ${playfair.variable} antialiased bg-black text-white`}
      >
        <SiteShell>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
