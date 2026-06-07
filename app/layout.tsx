import type { Metadata } from "next";
import "./globals.css";
import { WalletProviders } from "./providers";

export const metadata: Metadata = {
  title: "web3walletLogin",
  description: "Wallet login starter using SIWE",
  icons: {
    icon: "/dreaifekks-avatar.jpg",
    apple: "/dreaifekks-avatar.jpg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
