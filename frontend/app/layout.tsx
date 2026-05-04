import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ui/theme-provider/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://onlineu.mx/educore/"),
  title: "Educore - Sistema integral de gestion escolar | SIS + LMS",
  description:
    "Educore es una plataforma de gestion escolar todo-en-uno para Mexico: SIS, LMS, pagos, comunicacion y reportes.",
  openGraph: {
    title: "Educore - Sistema integral de gestion escolar",
    description: "SIS + LMS todo-en-uno para escuelas modernas en Mexico y Latinoamerica.",
    url: "https://onlineu.mx/educore/",
    siteName: "Educore",
    images: [{ url: "/og-educore.svg", width: 1200, height: 630, alt: "Educore" }],
    locale: "es_MX",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable, jakarta.variable, jetbrains.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="blue" themes={["blue", "light", "dark"]} enableSystem={false} disableTransitionOnChange={false}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
