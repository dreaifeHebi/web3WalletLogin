import type { Metadata } from "next";
import "./globals.css";
import { WalletProviders } from "./providers";

export const metadata: Metadata = {
  title: "web3walletLogin",
  description: "Wallet login starter using SIWE"
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
