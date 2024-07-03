using BlazorWalletConnect.Models;

namespace BlazorWalletConnect.Events;

public class AccountChangedEventArgs : EventArgs
{
    public required AccountDto? currentAccount { get; set; }
    public required AccountDto? prevAccount { get; set; }
}
