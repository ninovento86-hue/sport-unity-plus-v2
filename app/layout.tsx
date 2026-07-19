import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sport Unity Club — Portale Allenamento",
  description: "Il tuo spazio personale di allenamento e progressi, Sport Unity Club.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sport Unity Club",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-ink text-paper font-body min-h-screen">
        {children}
      </body>
    </html>
  );
}
