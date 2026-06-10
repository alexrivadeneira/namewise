import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Namewise",
  description: "Voice-powered relationship notes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen">{children}</body>
    </html>
  );
}
