import { Noto_Serif, Manrope } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import AuthProvider from '@/components/AuthProvider'
import "./globals.css";

const notoSerif = Noto_Serif({ variable: "--font-noto-serif", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${manrope.variable} ${notoSerif.variable} h-full`}>
        <body className="flex h-full w-full overflow-hidden m-0 p-0 bg-studio-bg">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 h-full flex flex-col min-w-0 relative">
              {children}
          </main>
        </AuthProvider>
        </body>
        </html>
    );
}