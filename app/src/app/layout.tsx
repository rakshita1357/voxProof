import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxProof",
  description: "Test the conversation before your customers do. Autonomous QA for Gnani voice agents.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
