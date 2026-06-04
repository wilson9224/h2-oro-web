import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

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
      <body className={`${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
