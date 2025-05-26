import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MeetIt - AI-Powered Meeting Transcription",
  description: "Real-time meeting transcription with AI-powered insights and summaries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <main className="min-h-screen bg-base-100">
        {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
