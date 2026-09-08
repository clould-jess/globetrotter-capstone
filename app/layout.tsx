import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./community-features.css";
import "./messaging.css";
import { AuthProvider } from "@/components/auth-provider";
import { DestinationProvider } from "@/components/destination-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cameroon Project — Voyage au Cameroun",
    template: "%s — Cameroon Project",
  },
  description: "Explorez les paysages, les cultures et les régions du Cameroun, puis créez votre itinéraire bilingue.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("cameroon-language");if(l==="en"){document.documentElement.dataset.lang="en";document.documentElement.lang="en"}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DestinationProvider>{children}</DestinationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
