import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Haunted Blocks",
  projectId: "haunted-blocks-sepolia", // can be any unique ID
  chains: [sepolia],
  ssr: false,
  transports: {
    [sepolia.id]: {
      http: "https://sepolia.infura.io/v3/35d2639e6dee4f938e950c6c96fa74a7",
    },
  },
});
