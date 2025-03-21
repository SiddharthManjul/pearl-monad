import type { Metadata } from "next";
import { Geist, Geist_Mono, Ubuntu } from "next/font/google";
import "./globals.css";
import {Toaster} from "react-hot-toast"
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { PrivyClientProvider } from "@/providers/PrivyProvider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const ubuntu = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const josefinSans = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PEARL AI",
  description: "MONAD chain, faster and Smarter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className={`relative w-full overflow-x-hidden ${geistSans.className} ${geistMono.className} ${ubuntu.className} ${josefinSans.className} antialiased`}
      >
        <PrivyClientProvider>
          <MantineProvider>
            {children}
          </MantineProvider>
        </PrivyClientProvider>
        <Toaster/>
      </body>
    </html>
  );
}
