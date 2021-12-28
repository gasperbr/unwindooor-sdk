import { BigNumber, providers } from 'ethers';
export interface IUnwindorConstructorParams {
    wethMakerAddress: string;
    preferTokens: string[];
    provider: providers.Provider;
    maxPriceImpact: BigNumber;
    priceSlippage: BigNumber;
}
export declare abstract class Unwindooor {
    wethMakerAddress: string;
    preferTokens: string[];
    provider: providers.Provider;
    maxPriceImpact: BigNumber;
    priceSlippage: BigNumber;
    /**
      * @param params.wethMakerAddress Address of the sushi or weth maker.
      * @param params.preferTokens Addresses of tokens we prefer to to unwind to (e.g. [SUSHI, WETH, USDC]).
      * @param params.provider instance of ethers.providers.Provider class.
      * @param params.maxPriceImpact Price impact we accept. Default is 1%, throws error if exceeded.
      *  Use 10 for 1%, 5 for 0.5%. Can indicate we need to setup a bridge for a token.
      * @param params.priceSlippage Slippage we add on top of minimum out. Use 0 for none, 10 for 1%;
      */
    constructor({ wethMakerAddress, preferTokens, provider, maxPriceImpact, priceSlippage }: IUnwindorConstructorParams);
    updatePriceSlippage(amount: BigNumber): void;
    /**
     * Calculate minimum output for unwinding a given pair
     * @param pairAddress Pair address.
     * @param unwindShare How much of our lp tokens we want to unwind. From 0 to 100 percent.
     */
    unwindPair(pairAddress: string, unwindShare: BigNumber): Promise<{
        amount: BigNumber;
        minimumOut: BigNumber;
        tokenA: string;
        tokenB: string;
    }>;
    _getUnwindData(pairAddress: string): Promise<{
        token0: string;
        token1: string;
        reserve0: BigNumber;
        reserve1: BigNumber;
        lpAmount: BigNumber;
        totalSupply: BigNumber;
    }>;
    _keepToken0(t0: string, t1: string, preferTokens: string[]): boolean;
    _getMinimumUnwindOut(reserve0: BigNumber, reserve1: BigNumber, amount: BigNumber, totalSupply: BigNumber, keepToken0: boolean): BigNumber;
    _getAmountOut(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber;
    _addSlippage(amount: BigNumber): BigNumber;
    _checkPriceImpact(outAmount: BigNumber, perfectOut: BigNumber): void;
}
