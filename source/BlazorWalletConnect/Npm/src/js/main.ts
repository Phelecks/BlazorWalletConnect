import { Web3Modal, createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { polygon, mainnet, arbitrum, Chain } from 'viem/chains'
import { ThemeMode } from '@web3modal/core'
import {
    reconnect, disconnect, Config, getAccount, getBalance, GetAccountReturnType,
    sendTransaction, SendTransactionErrorType, SendTransactionParameters, SendTransactionReturnType,
    waitForTransactionReceipt, WaitForTransactionReceiptReturnType, WaitForTransactionReceiptErrorType,
    prepareTransactionRequest, signMessage, SignMessageErrorType,
    watchAccount, watchChainId,
    readContract, ReadContractReturnType,
    getChainId, getEnsAddress, GetEnsAddressReturnType, getEnsName, GetEnsNameReturnType,
    getTransaction, GetTransactionReturnType
} from '@wagmi/core'
import { SignableMessage, erc721Abi, createPublicClient, http, Address } from 'viem'
import { normalize } from 'viem/ens'

let modal: Web3Modal;
let configured = false;
let walletConfig: Config;
let account: GetAccountReturnType;
let chains: ChainDto[];

interface ChainDto {
    chainId: number;
    rpcUrl?: string | null;
}

interface WalletConnectOptions {
    projectId: string;
    name: string;
    description: string;
    url: string;
    termsConditionsUrl?: string;
    privacyPolicyUrl?: string;
    enableEmail?: boolean;
    icons: string[];
    enableAnalytics?: boolean;
    enableOnramp?: boolean;
    SelectedChains: ChainDto[];
    themeMode?: string;
    themeVariableFontFamily?: string;
    themeVariableFontSize?: string;
    themeVariableAccentColor?: string;
    themeVariableColorMix?: string;
    themeVariableColorMixStrengthPercentage?: number;
    themeVariableBorderRadius?: string;
    themeVariableZIndex?: number;
}

export async function configure(walletConnectOptions: WalletConnectOptions, dotNetInterop: any) {
    if (configured) {
        return;
    }

    chains = walletConnectOptions.SelectedChains;

    const selectedChains = convertChains(walletConnectOptions.SelectedChains.map(x => x.chainId));
    
    const config = defaultWagmiConfig({
        chains: selectedChains,
        projectId: walletConnectOptions.projectId,
        enableEmail: walletConnectOptions.enableEmail,
        metadata: {
            name: walletConnectOptions.name,
            description: walletConnectOptions.description,
            url: walletConnectOptions.url,
            icons: walletConnectOptions.icons
        },
    })

    walletConfig = config;

    reconnect(config)

    modal = createWeb3Modal({
        wagmiConfig: config,
        projectId: walletConnectOptions.projectId,
        enableAnalytics: walletConnectOptions.enableAnalytics,
        enableOnramp: walletConnectOptions.enableOnramp,
        termsConditionsUrl: walletConnectOptions.termsConditionsUrl,
        defaultChain: selectedChains[0],
        privacyPolicyUrl: walletConnectOptions.privacyPolicyUrl,
        themeMode: walletConnectOptions.themeMode as ThemeMode,
        themeVariables: {
            "--w3m-font-family": walletConnectOptions.themeVariableFontFamily,
            "--w3m-font-size-master": walletConnectOptions.themeVariableFontSize,
            "--w3m-accent": walletConnectOptions.themeVariableAccentColor,
            "--w3m-color-mix": walletConnectOptions.themeVariableColorMix,
            "--w3m-color-mix-strength": walletConnectOptions.themeVariableColorMixStrengthPercentage,
            "--w3m-border-radius-master": walletConnectOptions.themeVariableBorderRadius,
            "--w3m-z-index": walletConnectOptions.themeVariableZIndex
        }
    })

    watchAccount(walletConfig, {
        onChange: (currenctAccount, prevAccount) => {
            dotNetInterop.invokeMethodAsync('OnAccountChanged', JSON.stringify(currenctAccount, connectorReplacer), JSON.stringify(prevAccount, connectorReplacer));
        }
    })

    watchChainId(walletConfig, {
        onChange: (currenctChainId, prevChainId) => {
            dotNetInterop.invokeMethodAsync('OnChainIdChanged', JSON.stringify(currenctChainId), JSON.stringify(prevChainId));
        }
    })

    configured = true;
}

export async function disconnectWallet() {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }
    await disconnect(walletConfig)
}

export async function getWalletAccount() {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }
    account = await getAccount(walletConfig)
    return JSON.stringify(account, connectorReplacer)
}

export async function getWalletChainId() {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }
    const result = await getChainId(walletConfig)
    return JSON.stringify(result)
}

export async function getWalletEnsAddress(name: string, blockNumber: bigint | undefined) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }
    const result: GetEnsAddressReturnType = await getEnsAddress(walletConfig, {
        name: normalize(name),
        blockNumber: blockNumber
    })
    return JSON.stringify(result)
}

export async function getWalletEnsName(address: Address, blockNumber: bigint | undefined) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }
    const result: GetEnsNameReturnType = await getEnsName(walletConfig, {
        address: address,
        blockNumber: blockNumber
    })
    return JSON.stringify(result)
}

export async function getWalletMainBalance() {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    let balance = await getBalance(walletConfig, {
        address: account.address!,
        chainId: account.chainId
    })
    return JSON.stringify(balance, bigIntegerReplacer)
}

export async function getBalanceOfErc20Token(tokenAddress: Address) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    let balance = await getBalance(walletConfig, {
        address: account.address!,
        chainId: account.chainId,
        token: tokenAddress
    })
    return JSON.stringify(balance, bigIntegerReplacer)
}

export async function SendTransaction(input: string, dotNetInterop: any) {
    if (!configured) {
        throw "Attempting to send transaction before we have configured.";
    }

    await validateAccount()

    try {
        const parsedTransaction: SendTransactionParameters = JSON.parse(input)

        const preparedTransaction = await prepareTransactionRequest(walletConfig, {
            to: parsedTransaction.to,
            value: parsedTransaction.value,
            chainId: account.chainId,
            type: 'legacy',
            data: parsedTransaction.data
        })

        const transactionHash: SendTransactionReturnType = await sendTransaction(walletConfig, {
            to: preparedTransaction.to!,
            value: preparedTransaction.value,
            gas: preparedTransaction.gas,
            gasPrice: preparedTransaction.gasPrice,
            chainId: account.chainId,
            type: 'legacy',
            data: preparedTransaction.data
        });

        setTimeout(async () => {
            try {
                const transactionReciept: WaitForTransactionReceiptReturnType = await waitForTransactionReceipt(walletConfig, {
                    confirmations: 1,
                    hash: transactionHash,
                    chainId: account.chainId
                })

                dotNetInterop.invokeMethodAsync("OnTransactionConfirmed", JSON.stringify(transactionReciept, transactionRecieptReplacer));
            } catch (e) {
                const error = e as WaitForTransactionReceiptErrorType

                if (error.name === 'TimeoutError')
                    return JSON.stringify(error.details)
                return error.message
            }
        }, 0);

        return JSON.stringify(transactionHash)
    } catch (e) {
        const error = e as SendTransactionErrorType

        if (error.name === 'TransactionExecutionError') {
            const cause = error.cause
            const stack = error.stack
            return JSON.stringify(error.details)
        }
        if (error.name === 'ConnectorAccountNotFoundError')
            return JSON.parse(error.details)
        if (error.name === 'ConnectorNotConnectedError')
            return JSON.parse(error.details)
        if (error.name === 'WagmiCoreError')
            return JSON.parse(error.details)
        if (error.name === 'ViemError')
            return JSON.parse(error.details)
        if (error.name === 'Error')
            return JSON.parse(error.message)
    }
}

export async function SignMessage(message: SignableMessage) {
    if (!configured) {
        throw "Attempting to sign message before we have configured.";
    }

    await validateAccount()

    try {
        const result = await signMessage(walletConfig, {
            message: message,
            account: account.address
        });

        return JSON.stringify(result);
    } catch (e) {
        const error = e as SignMessageErrorType
        if (error.name === 'Error')
            return JSON.stringify(error.message)
        if (error.name === 'TimeoutError')
            return JSON.stringify(error.details)
        return JSON.stringify(error.message)
    }
}

export async function getBalanceOfErc721Token(contractAddress: Address) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    const balance: ReadContractReturnType = await readContract(walletConfig, {
        address: contractAddress,
        chainId: account.chainId,
        functionName: 'balanceOf',
        abi: erc721Abi,
        args: [account.address!]
    })
    return JSON.stringify(balance, bigIntegerReplacer)
}

export async function getTokenOfOwnerByIndex(contractAddress: Address, index: bigint) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    const tokenId: ReadContractReturnType = await readContract(walletConfig, {
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
        //functionName: 'tokenByIndex',
        //abi: erc721Abi,
        args: [account.address!, index]
    })
    return JSON.stringify(tokenId, bigIntegerReplacer)
}

export async function getOwnerOf(contractAddress: Address, tokenId: bigint) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    const owner: ReadContractReturnType = await readContract(walletConfig, {
        address: contractAddress,
        chainId: account.chainId,
        functionName: 'ownerOf',
        abi: erc721Abi,
        args: [tokenId]
    })
    return JSON.stringify(owner)
}

export async function getStakedTokens(contractAddress: Address, stakeContractAddress: Address) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    var selectedChain = chains.find(exp => exp.chainId === account.chainId)

    const publicClient = await createPublicClient({
        chain: account.chain,
        transport: selectedChain === null ? http() : http(selectedChain?.rpcUrl!, {
            timeout: 20000
        }),
        batch: {
            multicall: true
        }
    })

    const stakeLogs = await publicClient.getLogs({
        address: contractAddress,
        event: erc721Abi[2],
        args: {
            from: account.address,
            to: stakeContractAddress,
            tokenId: null
        },
        strict: true,
        fromBlock: 'earliest',
        toBlock: 'latest'
    })

    const unStakeLogs = await publicClient.getLogs({
        address: contractAddress,
        event: erc721Abi[2],
        args: {
            from: stakeContractAddress,
            to: account.address,
            tokenId: null
        },
        strict: true,
        fromBlock: 'earliest',
        toBlock: 'latest'
    })

    if (stakeLogs == null || undefined)
        return null

    let distinctTokenIds: Array<bigint> = [];
    stakeLogs.forEach((item) => {
        if (distinctTokenIds.find(exp => exp === item.args.tokenId) === undefined)
            distinctTokenIds.push(item.args.tokenId)
    })

    let result: Array<bigint> = []

    distinctTokenIds.forEach((item) => {
        var stakes = stakeLogs.filter(exp => exp.args.tokenId === item).length
        var unstakes = unStakeLogs.filter(exp => exp.args.tokenId === item).length
        if (stakes > unstakes)
            result.push(item)
    })

    return JSON.stringify(result, bigIntegerReplacer)
}

export async function getTransctionByHash(hash: Address) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    let result: GetTransactionReturnType = await getTransaction(walletConfig, {
        hash: hash
    })
    return JSON.stringify(result, bigIntegerReplacer)
}

function connectorReplacer(key: string, value: string) {
    if (key == "connector") {
        return undefined;
    }
    return value;
}

function bigIntegerReplacer(key: string, value: any) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

function transactionRecieptReplacer(key: string, value: any) {
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

async function validateAccount() {
    if (account == undefined || account.address == undefined)
        account = await getAccount(walletConfig)
}

function getErrorResponse(e: any) {
    let response = {
        data: null,
        error: e.reason ?? e.message ?? e,
        success: false
    }
    return JSON.stringify(response);
}

function getSuccessResponse(result: any) {
    let response = {
        data: result,
        error: null,
        success: true
    };
    return JSON.stringify(response);
}

function convertChains(selectedChains: number[]): [Chain, ...Chain[]] {
    const chainMap: { [key: number]: Chain } = {
        1: mainnet,
        137: polygon,
        42161: arbitrum
    };
    
    let chains: [Chain, ...Chain[]] = [mainnet, ...selectedChains.map(chain => chainMap[chain])]
    chains.splice(0, 1);
    return chains;
}