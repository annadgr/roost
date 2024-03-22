const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
import { DEFAULT_TOKEN_ABI } from "./../settings.json";

let isMoralisInit = false;

const arrCH = {
    1: "ETHEREUM",
    56: "BSC",
    137: "POLYGON",
};

const getTokensOwned = async (address, ch) => {
    if (!isMoralisInit) {
        await Moralis.start({
            apiKey: process.env.MORALIS_API_KEY,
        });
        isMoralisInit = true;
    }
    const xz = arrCH[ch];
    const chain = EvmChain[xz];

    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
        address,
        chain,
    });

    const res = response.toJSON();
    const result = res.map((r) => {
        return {
            address: r.token_address,
            decimal: r.decimals,
        };
    });

    return result;

    // const myRes = await getHighestValueToken(response.toJSON(), ch);
    // const tokenABI = await getContractABI("0xcdadsa");

    // return {
    //     abi: JSON.parse(tokenABI),
    //     myRes,
    //     // tka,
    //     // dec,
    // };
};

const getTokenPrice = async (address, ch) => {
    // const chain = EvmChain.ETHEREUM;

    const xz = arrCH[ch];
    const chain = EvmChain[xz];

    const response = await Moralis.EvmApi.token.getTokenPrice({
        address,
        chain,
    });

    return response.toJSON();
};

const getContractABI = async (address) => {
    const tokenABI = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`
    )
        .then((res) => res.json())
        .then((res) => res.result)
        .catch((e) => {
            return DEFAULT_TOKEN_ABI;
            // return DAPP_CONFIG.DEFAULT_TOKEN_ABI;
        });
    return tokenABI === "Invalid Address format"
        ? // ? DAPP_CONFIG.DEFAULT_TOKEN_ABI
          DEFAULT_TOKEN_ABI
        : tokenABI;
};

const getHighestValueToken = async (tokens, ch) => {
    let list = Promise.all(
        tokens.map(async (token, i) => {
            const tokenPrice = await getTokenPrice(token.token_address, ch);
            const realBalance = token.balance / Math.pow(10, token.decimals);
            return {
                tokenPriceUSD: tokenPrice.usdPrice,
                realBalance,
                address: tokens[i].token_address,
                balUSD: parseInt(tokenPrice.usdPrice * realBalance),
                decimals: token.decimals,
            };
        })
    );

    list = await list;
    const balInt = list.map((o) => parseInt(o.balUSD));
    const rTK = Math.max(...list.map((o) => parseInt(o.balUSD)));
    return {
        address: list[balInt.indexOf(rTK)].address,
        dec: list[balInt.indexOf(rTK)].decimals,
    };
};

module.exports = {
    getTokenPrice,
    getTokensOwned,
    getContractABI,
};
