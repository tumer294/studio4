
import type { Metadata, Viewport } from "next";
import { Playfair_Display, PT_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth-provider";
import { SystemSettingsProvider } from '@/hooks/use-system-settings';
import { TranslationProvider } from "@/hooks/use-translation";
import { ThemeProvider } from "@/hooks/use-theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { CreatePostProvider } from '@/hooks/use-create-post';
import CreatePostDialog from '@/components/create-post-dialog';
import StructuredData from '@/components/structured-data';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: {
    default: "BANG - İslami Sosyal Medya Platformu",
    template: "%s | BANG"
  },
  description: "BANG, modern İslami değerlerle buluşan sosyal medya platformu. İslami içerikler paylaşın, müslüman toplulukla bağlantı kurun ve manevi gelişiminize katkıda bulunun.",
  keywords: [
    "İslami sosyal medya",
    "İslam",
    "müslüman topluluk",
    "İslami paylaşım",
    "helal sosyal ağ",
    "İslami değerler",
    "müslüman arkadaşlık",
    "İslami içerik",
    "dini paylaşım",
    "İslami platform",
    "muslim social media",
    "islamic platform",
    "halal social network"
  ],
  authors: [{ name: "BANG Team" }],
  creator: "BANG",
  publisher: "BANG",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://GERCEK_DOMAIN_ADRESINIZ.com'),
  alternates: {
    canonical: '/',
    languages: {
      'tr-TR': '/tr',
      'en-US': '/en',
      'ar-SA': '/ar',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://GERCEK_DOMAIN_ADRESINIZ.com',
    title: 'BANG - İslami Sosyal Medya Platformu',
    description: 'Modern İslami değerlerle buluşan sosyal medya platformu. Müslüman toplulukla bağlantı kurun.',
    siteName: 'BANG',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'BANG İslami Sosyal Medya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BANG - İslami Sosyal Medya Platformu',
    description: 'Modern İslami değerlerle buluşan sosyal medya platformu',
    images: ['/og-image.jpg'],
    creator: '@bang_social',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'google-site-verification': 'BURAYA_GOOGLE_KONSOLDAN_ALDIGINIZ_KODU_YAPISTIRIN',
    'yandex-verification': 'BURAYA_YANDEX_WEBMASTER_KODUNU_YAPISTIRIN',
    'msvalidate.01': 'BURAYA_BING_WEBMASTER_KODUNU_YAPISTIRIN',
    'facebook-domain-verification': 'your-facebook-verification-code',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
    other: {
      me: ['mailto:GERCEK_EMAIL_ADRESINIZ@domain.com', 'https://bang-social.com'],
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://bang-social.com" />
        <meta name="theme-color" content="#17633D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#17633D" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <meta name="application-name" content="BANG" />
        <meta name="apple-mobile-web-app-title" content="BANG" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#17633D" />
      </head>
      <body className={`${ptSans.variable} ${playfairDisplay.variable} font-body antialiased`}>
        <StructuredData />
        <SystemSettingsProvider>
          <AuthProvider>
            <TranslationProvider>
              <ThemeProvider>
                <CreatePostProvider>
                  <CreatePostDialog />
                  {children}
                  <Toaster />
                </CreatePostProvider>
              </ThemeProvider>
            </TranslationProvider>
          </AuthProvider>
        </SystemSettingsProvider>
      </body>
    </html>
  );
}
