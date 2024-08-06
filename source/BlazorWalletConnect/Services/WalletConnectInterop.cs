using BlazorWalletConnect.Events;
using BlazorWalletConnect.Models;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Nethereum.RPC.Eth.DTOs;
using System.Numerics;
using System.Text.Json;
using System.Threading;

namespace BlazorWalletConnect.Services
{
    public class WalletConnectInterop : IWalletConnectInterop
    {
        private IJSRuntime _jsRuntime;
        private readonly WalletConnectOptions _options;
        private readonly DotNetObjectReference<WalletConnectInterop> _jsRef;
        private bool _configured;
        private IJSObjectReference? _module;

        public WalletConnectInterop(IJSRuntime jsRuntime, IOptions<WalletConnectOptions> options)
        {
            _options = options.Value;
            _jsRuntime = jsRuntime;
            _jsRef = DotNetObjectReference.Create(this);
        }

        public async Task ConfigureAsync(CancellationToken cancellationToken)
        {
            if (!_configured)
            {
                var module = await GetModuleAsync(cancellationToken);
                //var module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import",
                //    "./_content/BlazorWalletConnect/main.bundle.js");
                await module.InvokeVoidAsync("configure", JsonSerializer.Serialize(_options), _jsRef);
                _configured = true;
            }
        }

        public async Task DisconnectAsync(CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            await module.InvokeVoidAsync("disconnectWallet", cancellationToken: cancellationToken);
        }

        public async Task<AccountDto?> GetAccountAsync(CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getWalletAccount", cancellationToken: cancellationToken);
            return JsonSerializer.Deserialize<AccountDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync(CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getWalletMainBalance", cancellationToken: cancellationToken);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync(string erc20TokenAddress, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getBalanceOfErc20Token", cancellationToken: cancellationToken, erc20TokenAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<BigInteger?> GetBalanceOfAsync(string erc721ContractAddress, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getBalanceOfErc721Token", cancellationToken: cancellationToken, erc721ContractAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BigInteger>(stringResult);
        }

        public async Task<BigInteger?> GetTokenOfOwnerByIndexAsync(string erc721ContractAddress, BigInteger index, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getTokenOfOwnerByIndex", cancellationToken: cancellationToken, erc721ContractAddress, (long)index);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BigInteger>(stringResult);
        }

        public async Task<List<BigInteger>?> GetStakedTokensAsync(string erc721ContractAddress, string erc721StakeContractAddress, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getStakedTokens", cancellationToken: cancellationToken, erc721ContractAddress, erc721StakeContractAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<List<BigInteger>?>(stringResult);
        }

        public async Task<string> SendTransactionAsync(TransactionInput transactionInput, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("SendTransaction", cancellationToken: cancellationToken, Newtonsoft.Json.JsonConvert.SerializeObject(transactionInput), _jsRef);
            try
            {
                var result = Newtonsoft.Json.JsonConvert.DeserializeObject<string>(stringResult);
                return result;
            }
            catch
            {
                throw new Exception(stringResult);
            }
        }

        [JSInvokable()]
        public Task OnTransactionConfirmed(string? transactionReceipt)
        {
            if (transactionReceipt is not null)
            {
                try
                {
                    var result = Newtonsoft.Json.JsonConvert.DeserializeObject<TransactionReceipt>(transactionReceipt);
                    if (result is not null)
                    {
                        RaiseTransactionConfirmed(result);
                    }
                }
                catch (Exception exception)
                {
                    throw new Exception(transactionReceipt);
                }
            }

            return Task.CompletedTask;
        }
        public event EventHandler<TransactionConfirmedEventArgs>? TransactionConfirmed;
        private void RaiseTransactionConfirmed(TransactionReceipt transactionReceipt)
        {
            var e = new TransactionConfirmedEventArgs { TransactionReceipt = transactionReceipt };
            TransactionConfirmed?.Invoke(this, e);
        }

        [JSInvokable()]
        public Task OnAccountChanged(string? currentAccount, string? prevAccount)
        {
            RaiseAccountChanged(Newtonsoft.Json.JsonConvert.DeserializeObject<AccountDto>(currentAccount),
                Newtonsoft.Json.JsonConvert.DeserializeObject<AccountDto>(prevAccount));

            return Task.CompletedTask;
        }
        public event EventHandler<AccountChangedEventArgs>? AccountChanged;
        private void RaiseAccountChanged(AccountDto? currentAccount, AccountDto? prevAccount)
        {
            var e = new AccountChangedEventArgs
            {
                currentAccount = currentAccount,
                prevAccount = prevAccount
            };
            AccountChanged?.Invoke(this, e);
        }

        [JSInvokable()]
        public Task OnChainIdChanged(int? currenctChainId, int? prevChainId)
        {
            RaiseChainIdChanged(currenctChainId, prevChainId);

            return Task.CompletedTask;
        }
        public event EventHandler<ChainIdChangedEventArgs>? ChainIdChanged;
        private void RaiseChainIdChanged(int? currentChainId, int? prevChainId)
        {
            var e = new ChainIdChangedEventArgs
            {
                currentChainId = currentChainId,
                prevChainId = prevChainId
            };
            ChainIdChanged?.Invoke(this, e);
        }

        public async Task<string> SignMessageAsync(string message, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("SignMessage", cancellationToken: cancellationToken, message);
            try
            {
                var result = Newtonsoft.Json.JsonConvert.DeserializeObject<string>(stringResult);
                return result;
            }
            catch
            {
                throw new Exception(stringResult);
            }
        }

        public async Task<int> GetChainIdAsync(CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getWalletChainId", cancellationToken: cancellationToken);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<int>(stringResult);
        }

        public async Task<string> GetEnsAddressAsync(string name, CancellationToken cancellationToken, BigInteger? blockNumber = null)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getWalletEnsAddress", cancellationToken: cancellationToken, name, blockNumber is null ? null :(long)blockNumber);
            return stringResult;
        }

        public async Task<string> GetEnsNameAsync(string address, CancellationToken cancellationToken, BigInteger? blockNumber = null)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getWalletEnsName", cancellationToken: cancellationToken, address, blockNumber is null ? null : (long)blockNumber);
            return stringResult;
        }

        public async Task<Transaction> GetTransactionByHashAsync(string hash, CancellationToken cancellationToken)
        {
            await EnsureConfiguredAsync(cancellationToken);
            var module = await GetModuleAsync(cancellationToken);
            var stringResult = await module.InvokeAsync<string>("getTransctionByHash", cancellationToken: cancellationToken, hash);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<Transaction>(stringResult);
        }

        public async Task SwitchChainIdAsync(int chainId)
        {
            await EnsureConfiguredAsync(CancellationToken.None);
            var module = await GetModuleAsync(CancellationToken.None);
            await module.InvokeAsync<string>("switchChainId", chainId);
        }



        async ValueTask IAsyncDisposable.DisposeAsync()
        {
            if (_module is not null)
                await _module.DisposeAsync();
        }
        async void IDisposable.Dispose()
        {
            if (_module is not null)
                await _module.DisposeAsync();
        }


        #region Methods
        private async ValueTask EnsureConfiguredAsync(CancellationToken cancellationToken)
        {
            if (!_configured)
            {
                await ConfigureAsync(cancellationToken);
            }
        }
        async Task<IJSObjectReference> GetModuleAsync(CancellationToken cancellationToken)
        {
            if (_module is null)
                _module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import", cancellationToken: cancellationToken,
                    "./_content/BlazorWalletConnect/main.bundle.js");
            return _module;
        }
        #endregion
    }
}
