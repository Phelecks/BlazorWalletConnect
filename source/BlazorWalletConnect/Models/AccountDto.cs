using System.Text.Json.Serialization;

namespace BlazorWalletConnect.Models;

public record AccountDto(
    [property: JsonPropertyName("address")] string? Address,
    [property: JsonPropertyName("addresses")] List<string> Addresses,
    [property: JsonPropertyName("isConnected")] bool IsConnected,
    [property: JsonPropertyName("isConnecting")] bool IsConnecting,
    [property: JsonPropertyName("isDisconnected")] bool IsDisconnected,
    [property: JsonPropertyName("isReconnecting")] bool IsReconnecting,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("chainId")] int ChainId);
