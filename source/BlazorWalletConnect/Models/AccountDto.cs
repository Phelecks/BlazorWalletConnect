using System.Text.Json.Serialization;

namespace BlazorWalletConnect.Models;

/// <summary>
/// Account data transfer object
/// </summary>
/// <param name="Address">Connected wallet address</param>
/// <param name="Addresses">Connected wallet addresses</param>
/// <param name="IsConnected">True: If wallet is connected</param>
/// <param name="IsConnecting">True: If wallet is in the process of connecting</param>
/// <param name="IsDisconnected">True: If wallet is disconnected</param>
/// <param name="IsReconnecting">True: If wallet is in the process of reconnecting</param>
/// <param name="Status">The string format of state (IsConnected, IsConnecting, IsDisconnected or IsReconnecting)</param>
/// <param name="ChainId">Chain id</param>
public record AccountDto(
    [property: JsonPropertyName("address")] string? Address,
    [property: JsonPropertyName("addresses")] List<string> Addresses,
    [property: JsonPropertyName("isConnected")] bool IsConnected,
    [property: JsonPropertyName("isConnecting")] bool IsConnecting,
    [property: JsonPropertyName("isDisconnected")] bool IsDisconnected,
    [property: JsonPropertyName("isReconnecting")] bool IsReconnecting,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("chainId")] int ChainId);
