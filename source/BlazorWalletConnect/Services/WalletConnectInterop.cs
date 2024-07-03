using BlazorWalletConnect.Events;
using BlazorWalletConnect.Models;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Nethereum.RPC.Eth.DTOs;
using System.Numerics;
using System.Text.Json;

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

        public async Task ConfigureAsync()
        {
            if (!_configured)
            {
                var module = await GetModuleAsync();
                //var module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import",
                //    "./_content/BlazorWalletConnect/main.bundle.js");
                await module.InvokeVoidAsync("configure", JsonSerializer.Serialize(_options), _jsRef);
                _configured = true;
            }
        }

        public async Task DisconnectAsync()
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            await module.InvokeVoidAsync("disconnectWallet");
        }

        public async Task<AccountDto?> GetAccountAsync()
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("getWalletAccount");
            return JsonSerializer.Deserialize<AccountDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync()
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("getWalletMainBalance");
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync(string erc20TokenAddress)
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("getBalanceOfErc20Token", erc20TokenAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<BigInteger?> GetBalanceOfAsync(string erc721ContractAddress)
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("getBalanceOfErc721Token", erc721ContractAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BigInteger>(stringResult);
        }

        public async Task<BigInteger?> GetTokenOfOwnerByIndexAsync(string erc721ContractAddress, BigInteger index)
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("getTokenOfOwnerByIndex", erc721ContractAddress, (long)index);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BigInteger>(stringResult);
        }

        public async Task<string> SendTransactionAsync(TransactionInput transactionInput)
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("SendTransaction", Newtonsoft.Json.JsonConvert.SerializeObject(transactionInput), _jsRef);
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

        public async Task<string> SignMessageAsync(string message)
        {
            await EnsureConfiguredAsync();
            var module = await GetModuleAsync();
            var stringResult = await module.InvokeAsync<string>("SignMessage", message);
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
        private async ValueTask EnsureConfiguredAsync()
        {
            if (!_configured)
            {
                await ConfigureAsync();
            }
        }
        async Task<IJSObjectReference> GetModuleAsync()
        {
            if (_module is null)
                _module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import",
                    "./_content/BlazorWalletConnect/main.bundle.js");
            return _module;
        }
        #endregion
    }
}
