"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const chains = [mainnet, sepolia] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  }
});

export const queryClient = new QueryClient();
