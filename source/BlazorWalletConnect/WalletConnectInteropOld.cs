using BlazorWalletConnect.Events;
using BlazorWalletConnect.Models;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Nethereum.RPC.Eth.DTOs;
using System.Text.Json;

namespace BlazorWalletConnect
{
    public class WalletConnectInteropOld : IAsyncDisposable, IWalletConnectInterop
    {
        private readonly Lazy<Task<IJSObjectReference>> _moduleTask;
        private readonly WalletConnectOptions _options;
        private readonly DotNetObjectReference<WalletConnectInterop> _jsRef;
        private bool _configured;

        public WalletConnectInteropOld(IJSRuntime jsRuntime, IOptions<WalletConnectOptions> options)
        {
            _moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>("import",
                "./_content/BlazorWalletConnect/main.bundle.js").AsTask());
            _options = options.Value;
            _jsRef = DotNetObjectReference.Create(this);
        }

        public async Task ConfigureAsync()
        {
            if (!_configured)
            {
                var module = await _moduleTask.Value;
                await module.InvokeVoidAsync("configure", JsonSerializer.Serialize(_options), _jsRef);
                _configured = true;
            }
        }

        public async Task DisconnectAsync()
        {
            await EnsureConfiguredAsync();
            var module = await _moduleTask.Value;
            await module.InvokeVoidAsync("disconnectWallet");
        }

        public async Task<AccountDto?> GetAccountAsync()
        {
            await EnsureConfiguredAsync();
            var module = await _moduleTask.Value;
            var stringResult = await module.InvokeAsync<string>("getWalletAccount");
            return JsonSerializer.Deserialize<AccountDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync()
        {
            await EnsureConfiguredAsync();
            var module = await _moduleTask.Value;
            var stringResult = await module.InvokeAsync<string>("getWalletMainBalance");
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<BalanceDto?> GetBalanceAsync(string tokenAddress)
        {
            await EnsureConfiguredAsync();
            var module = await _moduleTask.Value;
            var stringResult = await module.InvokeAsync<string>("getBalanceOfToken", tokenAddress);
            return Newtonsoft.Json.JsonConvert.DeserializeObject<BalanceDto>(stringResult);
        }

        public async Task<string> SendTransactionAsync(TransactionInput transactionInput)
        {
            await EnsureConfiguredAsync();
            var module = await _moduleTask.Value;
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
        /// <inheritdoc />
        public event EventHandler<TransactionConfirmedEventArgs>? TransactionConfirmed;
        private void RaiseTransactionConfirmed(TransactionReceipt transactionReceipt)
        {
            var e = new TransactionConfirmedEventArgs { TransactionReceipt = transactionReceipt };
            TransactionConfirmed?.Invoke(this, e);
        }








        public async ValueTask DisposeAsync()
        {
            if (_moduleTask.IsValueCreated)
            {
                var module = await _moduleTask.Value;
                await module.DisposeAsync();
            }
        }




        #region Methods
        private async ValueTask EnsureConfiguredAsync()
        {
            if (!_configured)
            {
                await ConfigureAsync();
            }
        }
        #endregion
    }
}
