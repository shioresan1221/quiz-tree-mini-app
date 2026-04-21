import type { Metadata } from "next";
import "./globals.css";
import { TelegramProvider } from "@/components/telegram-provider";

export const metadata: Metadata = {
  title: "Quiz Tree Mini App",
  description: "Telegram tap-to-earn quiz game powered by Google Sheets"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
