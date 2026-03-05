import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Raport Social Media | mysite.ai",
  description: "Analiza obecności Twojej restauracji w mediach społecznościowych",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
