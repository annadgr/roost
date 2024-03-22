import { createWeb3Modal } from "@web3modal/wagmi";

import { reconnect, http, createConfig } from "@wagmi/core";
import { mainnet, sepolia } from "@wagmi/core/chains";
import { coinbaseWallet, walletConnect, injected } from "@wagmi/connectors";
import { watchAccount, disconnect, getAccount } from "@wagmi/core";

// 1. Define constants
const projectId = "93f7705091db30ef5768caa2841bec8d";

const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
});
reconnect(config);

const modal = createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false, // Optional - defaults to your Cloud configuration
});

//main.js
// import { watchAccount, disconnect, getAccount } from '@wagmi/core'

function connect() {
  if (getAccount(config).isConnected) {
    disconnect(config);
  } else {
    modal.open();
  }
}

const btnEl = document.getElementById("btn");
const userEl = document.getElementById("user");

btnEl.addEventListener("click", connect);

// listening for account changes
watchAccount(config, {
  onChange(account) {
    userEl.innerText = account.address ?? "";
    if (account.isConnected) {
      btnEl.innerText = "Disconnect";
    } else {
      btnEl.innerText = "Connect";
    }
  },
});
