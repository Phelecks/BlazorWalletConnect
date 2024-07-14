using BlazorWalletConnect.Enums;
using System.Text.Json.Serialization;

namespace BlazorWalletConnect.Models;

public class ChainDto
{
    [JsonPropertyName("chainId")]
    public Chain Chain { get; set; }

    [JsonPropertyName("rpcUrl")]
    public string? RpcUrl { get; set; }
}