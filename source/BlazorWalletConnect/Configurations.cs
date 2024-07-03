using BlazorWalletConnect.Models;
using BlazorWalletConnect.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BlazorWalletConnect
{
    public static class Configurations
    {
        public static IServiceCollection AddWalletConnectConfiguration(this IServiceCollection services, Action<WalletConnectOptions>? configure)
        {
            services.Configure<WalletConnectOptions>(options =>
            {
                configure?.Invoke(options);
                if (string.IsNullOrEmpty(options.ProjectId))
                {
                    throw new Exception("You must provide a project Id to initialise WalletConnect.");
                }
            });

            services.AddScoped<IWalletConnectInterop, WalletConnectInterop>();

            return services;
        }
    }
}
