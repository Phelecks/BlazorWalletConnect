using System.Numerics;
using System.Text.Json.Serialization;

namespace BlazorWalletConnect.Models;

internal record WalletConnectBalanceDto(
    [property: JsonPropertyName("decimals")] int Decimals,
    [property: JsonPropertyName("formatted")] string Formatted,
    [property: JsonPropertyName("symbol")] string Symbol,
    [property: JsonPropertyName("value")] string Value);

public record BalanceDto(int Decimals, string Formatted, string Symbol, BigInteger Value);
