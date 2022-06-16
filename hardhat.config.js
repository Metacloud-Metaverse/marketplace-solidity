require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy');
require('dotenv').config()

// getting private keys from .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SCAN_API_KEY = process.env.SCAN_API_KEY;

module.exports = {   
    solidity: "0.8.15",
    networks: {
        hardhat: {},
        testnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            gasPrice: 20000000000,
            accounts: [`0x${PRIVATE_KEY}`],
        },
        mainnet: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts: [`0x${PRIVATE_KEY}`],
        }
    },
    namedAccounts: {
        deployer: {
            default: 0, // take the first account as deployer by default
            1: 0 // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
    },
    verify: {
        etherscan: {
            apiKey: SCAN_API_KEY,
        }
    }
};
