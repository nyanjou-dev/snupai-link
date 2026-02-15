import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexAuthProvider } from "./ConvexAuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "snupai.link - Link Shortener",
  description: "Clean, fast link shortener by Snupai",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-ctp-base text-ctp-text min-h-screen`}>
        <ConvexAuthProvider>{children}</ConvexAuthProvider>
      </body>
    </html>
  );
}
