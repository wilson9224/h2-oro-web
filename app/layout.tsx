import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
        className={`${spaceGrotesk.variable} ${plusJakarta.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
