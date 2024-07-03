namespace BlazorWalletConnect.Events;

public class ChainIdChangedEventArgs : EventArgs
{
    public required int? currentChainId { get; set; }
    public required int? prevChainId { get; set; }
}
