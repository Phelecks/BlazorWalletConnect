using System.Text.Json.Serialization;

namespace BlazorWalletConnect.Models;

public class WalletConnectOptions
{
    [JsonPropertyName("projectId")]
    public required string ProjectId { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("description")]
    public required string Description { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("termsConditionsUrl")]
    public required string TermsConditionsUrl { get; set; }

    [JsonPropertyName("privacyPolicyUrl")]
    public required string PrivacyPolicyUrl { get; set; }

    [JsonPropertyName("themeMode")]
    public required string ThemeMode { get; set; }

    [JsonPropertyName("backgroundColor")]
    public required string BackgroundColor { get; set; }

    [JsonPropertyName("accentColor")]
    public required string AccentColor { get; set; }

    [JsonPropertyName("enableEmail")]
    public required bool EnableEmail { get; set; }

    public required List<ChainDto> Chains { get; set; }

    [JsonPropertyName("chainIds")]
    public List<WalletConnectChainDto> ChainIds { get { return Chains.Select(s => new WalletConnectChainDto { chainId = (int)s.chain, rpcUrl = s.rpcUrl }).ToList(); } }
}

public class ChainDto
{
    public ChainDto(Chain chain, string? rpcUrl)
    {
        this.chain = chain;
        this.rpcUrl = rpcUrl;
    }

    public Chain chain { get; }
    public string? rpcUrl { get; }

}
public class WalletConnectChainDto
{
    public int chainId { get; set; }
    public string? rpcUrl { get; set; }

}
public enum Chain
{ Ethereum = 1, Polygon = 137, Arbitrum = 42161 }