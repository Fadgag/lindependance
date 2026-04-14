import { Noto_Serif, Manrope } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from '@/components/layout/MobileHeader'
import AuthProvider from '@/components/AuthProvider'
import RegisterServiceWorker from '@/components/RegisterServiceWorker'
import { Toaster } from 'sonner'
import "./globals.css";
import QuickAppointmentModal from '@/components/appointments/QuickAppointmentModal'

const notoSerif = Noto_Serif({ variable: "--font-noto-serif", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${manrope.variable} ${notoSerif.variable} h-full`}>
          <head>
            {/* PWA manifest and mobile meta-tags */}
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#111827" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Indépendance" />
            {/* Apple touch icon (developer should provide /public/icon-192.png and /public/icon-512.png) */}
            <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
          </head>
          <body className="flex h-full w-full overflow-hidden m-0 p-0 bg-studio-bg">
            <AuthProvider>
              <MobileHeader />
              <Sidebar />
              <main className="flex-1 h-full flex flex-col min-w-0 relative pt-16 md:pt-0">
                {children}
              </main>
              <Toaster position="top-right" richColors />
              <QuickAppointmentModal />
              <RegisterServiceWorker />
            </AuthProvider>
          </body>
        </html>
    );
}