import { Web3Modal, createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { polygon, mainnet, arbitrum } from 'viem/chains'
import {
    reconnect, disconnect, Config, getAccount, getBalance, GetAccountReturnType,
    sendTransaction, SendTransactionErrorType, SendTransactionParameters, SendTransactionReturnType,
    waitForTransactionReceipt, WaitForTransactionReceiptReturnType, WaitForTransactionReceiptErrorType,
    prepareTransactionRequest, signMessage, SignMessageErrorType,
    watchAccount, watchChainId,
    readContract, ReadContractReturnType
} from '@wagmi/core'
import { SignableMessage, erc721Abi } from 'viem'

let modal: Web3Modal
let configured = false
let walletConfig: Config
let account: GetAccountReturnType

export async function configure(options: any, dotNetInterop: any) {
    if (configured) {
        return;
    }
    let { projectId, name, description, url, termsConditionsUrl, privacyPolicyUrl, themeMode, backgroundColor, accentColor,
        enableEmail, chainIds } = JSON.parse(options);

    // 2. Create wagmiConfig
    const metadata = {
        name: name,
        description: description,
        url: url, // origin must match your domain & subdomain.
        icons: ['https://avatars.githubusercontent.com/u/37784886']
    }

    const chains = [polygon] as const
    const config = defaultWagmiConfig({
        chains,
        projectId,
        metadata,
        enableEmail: enableEmail
        //...wagmiOptions // Optional - Override createConfig parameters
    })

    walletConfig = config

    reconnect(config)

    // 3. Create modal
    modal = createWeb3Modal({
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

export async function getBalanceOfErc20Token(tokenAddress: '0x${string}') {
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
            }
            catch (e) {
                const error = e as WaitForTransactionReceiptErrorType

                if (error.name === 'TimeoutError')
                    return JSON.stringify(error.details)
                return error.message
            }
        }, 0);

        return JSON.stringify(transactionHash) 
    }
    catch (e) {
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
    }
    catch (e) {
        const error = e as SignMessageErrorType
        if (error.name === 'Error')
            return JSON.stringify(error.message)
        if (error.name === 'TimeoutError')
            return JSON.stringify(error.details)
        return JSON.stringify(error.message)
    }
}

export async function getBalanceOfErc721Token(contractAddress: '0x${string}') {
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

export async function getTokenOfOwnerByIndex(contractAddress: '0x${string}', index: bigint) {
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
        args: [account.address!, index]
    })
    return JSON.stringify(tokenId, bigIntegerReplacer)
}

export async function getStakes(contractAddress: '0x${string}', tokenId: bigint) {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    const stakeTicks: ReadContractReturnType = await readContract(walletConfig, {
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
        args: [account.address!, tokenId]
    })
    return JSON.stringify(stakeTicks, bigIntegerReplacer)
}

export async function getOwnerOf(contractAddress: '0x${string}', tokenId: bigint) {
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




function connectorReplacer(key:string, value:string) {
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