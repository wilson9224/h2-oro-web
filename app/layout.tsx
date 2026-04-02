import type { Metadata } from "next";
import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "H2 Oro | Joyería Artesanal de Lujo",
  description:
    "Creamos piezas únicas de joyería artesanal en oro. Diseño personalizado, calidad excepcional y tradición orfebrera colombiana.",
  keywords: ["joyería", "oro", "artesanal", "Colombia", "lujo", "anillos", "collares", "personalizado"],
  openGraph: {
    title: "H2 Oro | Joyería Artesanal de Lujo",
    description: "Piezas únicas de joyería artesanal en oro. Diseño personalizado y calidad excepcional.",
    type: "website",
    locale: "es_CO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
