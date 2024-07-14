using System.Text.Json.Serialization;
using BlazorWalletConnect.Enums;

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

    [JsonPropertyName("enableEmail")]
    public required bool EnableEmail { get; set; }

    [JsonPropertyName("icons")]
    public required List<string> Icons { get; set; } = new() { "https://avatars.githubusercontent.com/u/37784886" };

    /// <summary>
    /// Optional - defaults to your Cloud configuration
    /// </summary>
    [JsonPropertyName("enableAnalytics")]
    public required bool EnableAnalytics { get; set; } = true;

    /// <summary>
    /// Optional - false as default
    /// </summary>
    [JsonPropertyName("enableOnramp")]
    public required bool EnableOnramp { get; set; } = true;

    /// <summary>
    /// All chains you want to add support for with Web3Modal. Defaults to <see cref="Chain.Mainnet"/>
    /// </summary>
    [JsonPropertyName("selectedChains")]
    public required List<ChainDto> SelectedChains { get; set; } = new() { new ChainDto { Chain = Chain.Mainnet, RpcUrl = null } };

    /// <summary>
    /// By default themeMode option will be set to user system settings 'light' or 'dark'.
    /// </summary>
    [JsonPropertyName("themeMode")]
    public required string ThemeMode { get; set; }

    /// <summary>
    /// Base font family
    /// </summary>
    [JsonPropertyName("themeVariableFontFamily")]
    public required string ThemeVariableFontFamily { get; set; }

    /// <summary>
    /// The base pixel size for fonts.
    /// </summary>
    [JsonPropertyName("themeVariableFontSize")]
    public required string ThemeVariableFontSize { get; set; }

    /// <summary>
    /// Color used for buttons, icons, labels, etc.
    /// </summary>
    [JsonPropertyName("themeVariableAccentColor")]
    public required string ThemeVariableAccentColor { get; set; }

    /// <summary>
    /// The color that blends in with the default colors
    /// </summary>
    [JsonPropertyName("themeVariableColorMix")]
    public required string ThemeVariableColorMix { get; set; }

    /// <summary>
    /// The percentage on how much "--w3m-color-mix" should blend in
    /// </summary>
    [JsonPropertyName("themeVariableColorMixStrengthPercentage")]
    public required short ThemeVariableColorMixStrengthPercentage { get; set; }

    /// <summary>
    /// The base border radius in pixels.
    /// </summary>
    [JsonPropertyName("themeVariableBorderRadius")]
    public required string ThemeVariableBorderRadius { get; set; }

    /// <summary>
    /// The z-index of the modal.
    /// </summary>
    [JsonPropertyName("themeVariableZIndex")]
    public required double ThemeVariableZIndex { get; set; }
}