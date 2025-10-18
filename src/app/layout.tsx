import type { Metadata, Viewport } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChunkErrorHandler } from "@/components/chunk-error-handler";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ChatWidget } from "@/components/features/Chat";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "QuicklyClose",
  description: "Sell your home fast, get a fair cash offer.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "QuicklyClose",
    description: "Sell your home fast, get a fair cash offer.",
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "QuicklyClose",
    description: "Sell your home fast, get a fair cash offer.",
    images: ['/logo.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'QuicklyClose',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable}`} suppressHydrationWarning={true}>
        <ChunkErrorHandler />
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <ChatWidget />
          </AuthProvider>
        </ErrorBoundary>
        <PWAInstallPrompt />
        <div id="modal-root" />
      </body>
    </html>
  );
}
