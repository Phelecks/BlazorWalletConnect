import { Web3Modal, createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { polygon, mainnet, arbitrum, Chain } from 'viem/chains'
import {
    reconnect, disconnect, Config, getAccount, getBalance, GetAccountReturnType,
    sendTransaction, SendTransactionErrorType, SendTransactionParameters, SendTransactionReturnType,
    waitForTransactionReceipt, WaitForTransactionReceiptReturnType, WaitForTransactionReceiptErrorType,
    prepareTransactionRequest, signMessage, SignMessageErrorType,
    watchAccount, watchChainId,
    readContract, ReadContractReturnType
} from '@wagmi/core'
import { SignableMessage, erc721Abi, createPublicClient, http } from 'viem'

let modal: Web3Modal
let configured = false
let walletConfig: Config
let account: GetAccountReturnType
interface CustomChain {
    chainId: number,
    rpcUrl: string | null
}
let clientChainIds: [CustomChain]

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

    let chains: [Chain] = [mainnet]
    chains.splice(0, 1)
    chainIds.forEach((item: CustomChain) => {
        if (chains)
            if (mainnet.id === item.chainId)
                chains.push(mainnet)
            else if (polygon.id === item.chainId)
                chains.push(polygon)
            else if (arbitrum.id === item.chainId)
                chains.push(arbitrum)
            else
                throw 'ChainId not found.';
        if (clientChainIds === undefined)
            clientChainIds = [{ chainId: item.chainId, rpcUrl: item.rpcUrl }]
        else
            clientChainIds.push(item!)
    })

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
        //functionName: 'tokenByIndex',
        //abi: erc721Abi,
        args: [account.address!, index]
    })
    return JSON.stringify(tokenId, bigIntegerReplacer)
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

export async function getStakedTokens(contractAddress: '0x${string}', stakeContractAddress: '0x${string}') {
    if (!configured) {
        throw "Attempting to disconnect before we have configured.";
    }

    await validateAccount()

    var selectedChain = clientChainIds.find(exp => exp.chainId === account.chainId)


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