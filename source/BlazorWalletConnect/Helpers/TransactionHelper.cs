using Nethereum.Contracts.MessageEncodingServices;
using Nethereum.Contracts;
using Nethereum.RPC.Eth.DTOs;

namespace BlazorWalletConnect.Helpers;

public static class TransactionHelper
{
    /// <summary>
    /// Creates a TransactionInput suitable for interacting with a smart contract for use with <see cref="IWeb3ModalInterop.SendTransaction(TransactionInput)"/>
    /// </summary>
    /// <typeparam name="T">The type of the function message</typeparam>
    /// <param name="request">The request to send</param>
    /// <param name="from">The address to send from</param>
    /// <param name="contractAddress">The contract address to interact with</param>
    /// <returns>A valid TransactionInput</returns>
    public static TransactionInput CreateContractTransactionInput<T>(T request, string from, string contractAddress) where T : FunctionMessage, new()
    {
        request.FromAddress = from;

        var functionMessageEncodingService = new FunctionMessageEncodingService<T>();

        var transactionInput = functionMessageEncodingService.CreateTransactionInput(request);

        transactionInput.To = contractAddress;

        return transactionInput;
    }
}
