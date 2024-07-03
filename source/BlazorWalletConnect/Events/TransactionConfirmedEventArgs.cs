using Nethereum.RPC.Eth.DTOs;

namespace BlazorWalletConnect.Events;

public class TransactionConfirmedEventArgs : EventArgs
{
    public required TransactionReceipt TransactionReceipt { get; set; }
}
