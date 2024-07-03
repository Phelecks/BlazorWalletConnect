using BlazorWalletConnect.Events;
using BlazorWalletConnect.Models;
using Nethereum.RPC.Eth.DTOs;
using System.Numerics;

namespace BlazorWalletConnect.Services;

public interface IWalletConnectInterop : IAsyncDisposable, IDisposable
{
    Task ConfigureAsync();
    Task DisconnectAsync();

    Task<AccountDto?> GetAccountAsync();
    Task<BalanceDto?> GetBalanceAsync();
    Task<BalanceDto?> GetBalanceAsync(string erc20TokenAddress);
    Task<string> SendTransactionAsync(TransactionInput transactionInput);
    Task<string> SignMessageAsync(string message);
    Task<BigInteger?> GetBalanceOfAsync(string erc721ContractAddress);
    Task<BigInteger?> GetTokenOfOwnerByIndexAsync(string erc721ContractAddress, BigInteger index);



    event EventHandler<TransactionConfirmedEventArgs>? TransactionConfirmed;
    event EventHandler<AccountChangedEventArgs>? AccountChanged;
    event EventHandler<ChainIdChangedEventArgs>? ChainIdChanged;
}