import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Barlow_Condensed,
  Barlow,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Energi Electric",
  description: "Business management for Energi Electric",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Energi",
  },
  openGraph: {
    title: "Energi Electric",
    description: "Reliable protection. Safer homes.",
    images: [{ url: "/brand/energi-logo-horizontal.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#045815",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} ${barlow.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
