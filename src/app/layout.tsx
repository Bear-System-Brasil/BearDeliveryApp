import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { AppFrame } from "@/components/ui/app-frame";
import { AuthProvider } from "@/contexts/auth-provider";
import { Providers } from "@/providers";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import type React from "react";
import { Suspense } from "react";
import "./globals.css";

// Fonte dos mocks de UI (Lojas/Novidades): geométrica e arredondada, fica
// mais leve que a do sistema nos títulos em peso alto. Variável, então
// cobre 400-800 num arquivo só.
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'BearDelivery',
  icons: {
    icon: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  }
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`font-sans ${figtree.variable} ${GeistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ErrorBoundary>
            <Providers>
              <AuthProvider>
                <NotificationsProvider>
                  <AppFrame>
                    <Suspense fallback={null}>{children}</Suspense>
                  </AppFrame>
                </NotificationsProvider>
              </AuthProvider>
            </Providers>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
