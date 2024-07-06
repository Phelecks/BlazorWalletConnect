using BlazorWalletConnect.Events;
using BlazorWalletConnect.Models;
using Nethereum.RPC.Eth.DTOs;
using System.Numerics;

namespace BlazorWalletConnect.Services;

public interface IWalletConnectInterop : IAsyncDisposable, IDisposable
{
    /// <summary>
    /// Configure wallet connect with custom options
    /// </summary>
    /// <returns></returns>
    Task ConfigureAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Disconnect wallet connect
    /// </summary>
    /// <returns></returns>
    Task DisconnectAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get connected account data and states
    /// </summary>
    /// <returns></returns>
    Task<AccountDto?> GetAccountAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get balance (Chain token, like Eth or Matic) of account for current selected chain
    /// </summary>
    /// <returns></returns>
    Task<BalanceDto?> GetBalanceAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get balance of ERC20 token
    /// </summary>
    /// <param name="erc20TokenAddress">ERC20 Token address like USDT, USDC or ...</param>
    /// <returns></returns>
    Task<BalanceDto?> GetBalanceAsync(string erc20TokenAddress, CancellationToken cancellationToken);

    /// <summary>
    /// Send transaction (use when you need to send transaction to wallet connect and user has to confirm it, like Transfer, approve, stake and ...
    /// </summary>
    /// <param name="transactionInput">Nethereum transaction format (You can use TransactionHelper to create nethereum based transaction input)</param>
    /// <returns></returns>
    Task<string> SendTransactionAsync(TransactionInput transactionInput, CancellationToken cancellationToken);

    /// <summary>
    /// Sign a message with wallet connect
    /// </summary>
    /// <param name="message"></param>
    /// <returns></returns>
    Task<string> SignMessageAsync(string message, CancellationToken cancellationToken);

    /// <summary>
    /// Get balance of ERC721 token like smart contract
    /// </summary>
    /// <param name="erc721ContractAddress"></param>
    /// <returns></returns>
    Task<BigInteger?> GetBalanceOfAsync(string erc721ContractAddress, CancellationToken cancellationToken);

    /// <summary>
    /// Get ERC721 TokenOfOwnerByIndex
    /// </summary>
    /// <param name="erc721ContractAddress">ERC721 contract address</param>
    /// <param name="index">Index of token</param>
    /// <returns></returns>
    Task<BigInteger?> GetTokenOfOwnerByIndexAsync(string erc721ContractAddress, BigInteger index, CancellationToken cancellationToken);

    /// <summary>
    /// Get staked tokens, every smart contract that has stake process, needs this data. 
    /// In stake process, an NFT token will transfer from user wallet address to stake smart contract address and in UnStake process, 
    /// it will transfer from stake contract address back to user wallet address. So the process is to get transfer events with specified filters 
    /// and get this data.
    /// </summary>
    /// <param name="erc721ContractAddress">ERC721 smart contract address</param>
    /// <param name="erc721StakeContractAddress">ERC721 stake smart contract address</param>
    /// <returns></returns>
    Task<List<BigInteger>?> GetStakedTokensAsync(string erc721ContractAddress, string erc721StakeContractAddress, CancellationToken cancellationToken);

    /// <summary>
    /// Get chain id
    /// </summary>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    Task<int> GetChainIdAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Get ENS address
    /// </summary>
    /// <param name="name">Name</param>
    /// <param name="blockNumber">Block number (optional)</param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    Task<string> GetEnsAddressAsync(string name, CancellationToken cancellationToken, BigInteger? blockNumber = null);

    /// <summary>
    /// Get ENS name
    /// </summary>
    /// <param name="address">Address</param>
    /// <param name="cancellationToken"></param>
    /// <param name="blockNumber">Block number (optional)</param>
    /// <returns></returns>
    Task<string> GetEnsNameAsync(string address, CancellationToken cancellationToken, BigInteger? blockNumber = null);

    /// <summary>
    /// Get transaction by hash
    /// </summary>
    /// <param name="hash">Hash</param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    Task<Transaction> GetTransactionByHashAsync(string hash, CancellationToken cancellationToken);



    event EventHandler<TransactionConfirmedEventArgs>? TransactionConfirmed;
    event EventHandler<AccountChangedEventArgs>? AccountChanged;
    event EventHandler<ChainIdChangedEventArgs>? ChainIdChanged;
}