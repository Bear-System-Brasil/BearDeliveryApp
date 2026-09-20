import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { AppFrame } from "@/components/ui/app-frame";
import { AuthProvider } from "@/contexts/auth-provider";
import { Providers } from "@/providers";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type React from "react";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Like Delivery App",
  description: "Sistema completo de delivery",
};

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
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}
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
