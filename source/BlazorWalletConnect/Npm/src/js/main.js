"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerOf = exports.getStakes = exports.getTokenOfOwnerByIndex = exports.getBalanceOfErc721Token = exports.SignMessage = exports.SendTransaction = exports.getBalanceOfErc20Token = exports.getWalletMainBalance = exports.getWalletAccount = exports.disconnectWallet = exports.configure = void 0;
const wagmi_1 = require("@web3modal/wagmi");
const chains_1 = require("viem/chains");
const core_1 = require("@wagmi/core");
const viem_1 = require("viem");
let modal;
let configured = false;
let walletConfig;
let account;
function configure(options, dotNetInterop) {
    return __awaiter(this, void 0, void 0, function* () {
        if (configured) {
            return;
        }
        let { projectId, name, description, url, termsConditionsUrl, privacyPolicyUrl, themeMode, backgroundColor, accentColor, enableEmail } = JSON.parse(options);
        // 2. Create wagmiConfig
        const metadata = {
            name: name,
            description: description,
            url: url, // origin must match your domain & subdomain.
            icons: ['https://avatars.githubusercontent.com/u/37784886']
        };
        const chains = [chains_1.polygon];
        const config = (0, wagmi_1.defaultWagmiConfig)({
            chains,
            projectId,
            metadata,
            enableEmail: enableEmail
            //...wagmiOptions // Optional - Override createConfig parameters
        });
        walletConfig = config;
        (0, core_1.reconnect)(config);
        // 3. Create modal
        modal = (0, wagmi_1.createWeb3Modal)({
            wagmiConfig: config,
            projectId,
            enableAnalytics: true, // Optional - defaults to your Cloud configuration
            enableOnramp: true, // Optional - false as default
            termsConditionsUrl: termsConditionsUrl,
            defaultChain: chains[0],
            privacyPolicyUrl: privacyPolicyUrl,
            themeMode: themeMode,
            themeVariables: {
                '--w3m-color-mix': backgroundColor,
                '--w3m-accent': accentColor
            }
        });
        (0, core_1.watchAccount)(walletConfig, {
            onChange: (currenctAccount, prevAccount) => {
                dotNetInterop.invokeMethodAsync('OnAccountChanged', JSON.stringify(currenctAccount, connectorReplacer), JSON.stringify(prevAccount, connectorReplacer));
            }
        });
        (0, core_1.watchChainId)(walletConfig, {
            onChange: (currenctChainId, prevChainId) => {
                dotNetInterop.invokeMethodAsync('OnChainIdChanged', JSON.stringify(currenctChainId), JSON.stringify(prevChainId));
            }
        });
        configured = true;
    });
}
exports.configure = configure;
function disconnectWallet() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield (0, core_1.disconnect)(walletConfig);
    });
}
exports.disconnectWallet = disconnectWallet;
function getWalletAccount() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        account = yield (0, core_1.getAccount)(walletConfig);
        return JSON.stringify(account, connectorReplacer);
    });
}
exports.getWalletAccount = getWalletAccount;
function getWalletMainBalance() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        let balance = yield (0, core_1.getBalance)(walletConfig, {
            address: account.address,
            chainId: account.chainId
        });
        return JSON.stringify(balance, bigIntegerReplacer);
    });
}
exports.getWalletMainBalance = getWalletMainBalance;
function getBalanceOfErc20Token(tokenAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        let balance = yield (0, core_1.getBalance)(walletConfig, {
            address: account.address,
            chainId: account.chainId,
            token: tokenAddress
        });
        return JSON.stringify(balance, bigIntegerReplacer);
    });
}
exports.getBalanceOfErc20Token = getBalanceOfErc20Token;
function SendTransaction(input, dotNetInterop) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to send transaction before we have configured.";
        }
        yield validateAccount();
        try {
            const parsedTransaction = JSON.parse(input);
            const preparedTransaction = yield (0, core_1.prepareTransactionRequest)(walletConfig, {
                to: parsedTransaction.to,
                value: parsedTransaction.value,
                chainId: account.chainId,
                type: 'legacy',
                data: parsedTransaction.data
            });
            const transactionHash = yield (0, core_1.sendTransaction)(walletConfig, {
                to: preparedTransaction.to,
                value: preparedTransaction.value,
                gas: preparedTransaction.gas,
                gasPrice: preparedTransaction.gasPrice,
                chainId: account.chainId,
                type: 'legacy',
                data: preparedTransaction.data
            });
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const transactionReciept = yield (0, core_1.waitForTransactionReceipt)(walletConfig, {
                        confirmations: 1,
                        hash: transactionHash,
                        chainId: account.chainId
                    });
                    dotNetInterop.invokeMethodAsync("OnTransactionConfirmed", JSON.stringify(transactionReciept, transactionRecieptReplacer));
                }
                catch (e) {
                    const error = e;
                    if (error.name === 'TimeoutError')
                        return JSON.stringify(error.details);
                    return error.message;
                }
            }), 0);
            return JSON.stringify(transactionHash);
        }
        catch (e) {
            const error = e;
            if (error.name === 'TransactionExecutionError') {
                const cause = error.cause;
                const stack = error.stack;
                return JSON.stringify(error.details);
            }
            if (error.name === 'ConnectorAccountNotFoundError')
                return JSON.parse(error.details);
            if (error.name === 'ConnectorNotConnectedError')
                return JSON.parse(error.details);
            if (error.name === 'WagmiCoreError')
                return JSON.parse(error.details);
            if (error.name === 'ViemError')
                return JSON.parse(error.details);
            if (error.name === 'Error')
                return JSON.parse(error.message);
        }
    });
}
exports.SendTransaction = SendTransaction;
function SignMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to sign message before we have configured.";
        }
        yield validateAccount();
        try {
            const result = yield (0, core_1.signMessage)(walletConfig, {
                message: message,
                account: account.address
            });
            return JSON.stringify(result);
        }
        catch (e) {
            const error = e;
            if (error.name === 'Error')
                return JSON.stringify(error.message);
            if (error.name === 'TimeoutError')
                return JSON.stringify(error.details);
            return JSON.stringify(error.message);
        }
    });
}
exports.SignMessage = SignMessage;
function getBalanceOfErc721Token(contractAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        const balance = yield (0, core_1.readContract)(walletConfig, {
            address: contractAddress,
            chainId: account.chainId,
            functionName: 'balanceOf',
            abi: viem_1.erc721Abi,
            args: [account.address]
        });
        return JSON.stringify(balance, bigIntegerReplacer);
    });
}
exports.getBalanceOfErc721Token = getBalanceOfErc721Token;
function getTokenOfOwnerByIndex(contractAddress, index) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        const tokenId = yield (0, core_1.readContract)(walletConfig, {
            address: contractAddress,
            chainId: account.chainId,
            functionName: 'tokenOfOwnerByIndex',
            abi: [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "owner",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "index",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenOfOwnerByIndex",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ],
            args: [account.address, index]
        });
        return JSON.stringify(tokenId, bigIntegerReplacer);
    });
}
exports.getTokenOfOwnerByIndex = getTokenOfOwnerByIndex;
function getStakes(contractAddress, tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        const stakeTicks = yield (0, core_1.readContract)(walletConfig, {
            address: contractAddress,
            chainId: account.chainId,
            functionName: 'stakes',
            abi: [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "name": "stakes",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ],
            args: [account.address, tokenId]
        });
        return JSON.stringify(stakeTicks, bigIntegerReplacer);
    });
}
exports.getStakes = getStakes;
function getOwnerOf(contractAddress, tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!configured) {
            throw "Attempting to disconnect before we have configured.";
        }
        yield validateAccount();
        const owner = yield (0, core_1.readContract)(walletConfig, {
            address: contractAddress,
            chainId: account.chainId,
            functionName: 'ownerOf',
            abi: viem_1.erc721Abi,
            args: [tokenId]
        });
        return JSON.stringify(owner);
    });
}
exports.getOwnerOf = getOwnerOf;
function connectorReplacer(key, value) {
    if (key == "connector") {
        return undefined;
    }
    return value;
}
function bigIntegerReplacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}
function transactionRecieptReplacer(key, value) {
    if (key === 'status') {
        if (value === 'success')
            return Number(1);
        if (value === 'reverted')
            return Number(0);
        return Number(0);
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}
function validateAccount() {
    return __awaiter(this, void 0, void 0, function* () {
        if (account == undefined || account.address == undefined)
            account = yield (0, core_1.getAccount)(walletConfig);
    });
}
//# sourceMappingURL=main.js.map