import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Petti Feeder — Ухаалаг хооллогч",
  description:
    "ESP32-C6 болон Firebase ашигласан ухаалаг амьтан тэжээгч. Камер стрим, хоолны түвшин, усны насос.",
};

export const viewport: Viewport = {
  themeColor: "#f472b6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <LanguageProvider>{children}</LanguageProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.6)",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              color: "#334155",
              fontSize: "14px",
              fontFamily: "var(--font-geist-sans)",
            },
            success: {
              iconTheme: { primary: "#f472b6", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#f87171", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
