import { BigNumber, Contract } from 'ethers';
import { IUnwindorConstructorParams, Unwindooor } from './Unwindooor';
interface IWethMakerConstructorParams extends IUnwindorConstructorParams {
    wethAddress: string;
    sushiAddress: string;
    factoryAddress: string;
}
export declare class WethMaker extends Unwindooor {
    wethAddress: string;
    sushiAddress: string;
    factory: Contract;
    maker: Contract;
    /**
      * @param params.wethMakerAddress Address of the sushi or weth maker.
      * @param params.preferTokens Addresses of tokens we prefer to to unwind to (e.g. [SUSHI, WETH, USDC]).
      * @param params.provider instance of ethers.providers.Provider class.
      * @param params.maxPriceImpact Price impact we accept. Default is 1%, throws error if exceeded.
      *  Use 10 for 1%, 5 for 0.5%. Can indicate we need to setup a bridge for a token.
      * @param params.priceSlippage Slippage we add on top of minimum out. Use 0 for none, 10 for 1%;
      * @param params.wethAddress Wrapped Ethereum token address.
      * @param params.sushiAddress Sushi token address.
      * @param params.factoryAddress Sushi factory address.
      */
    constructor(params: IWethMakerConstructorParams);
    /**
     * Calculate minimum out for selling into WETH.
     * @param tokenAddress Token we are selling.
     * @param unwindShare How much of our token balance we are selling. From 0 to 100 percent.
     */
    sellToken(token: string, sellShare: BigNumber): Promise<{
        amountIn: BigNumber;
        minimumOut: BigNumber;
    }>;
    _getPair(inToken: string): Promise<string>;
    _getMarketData(pairAddress: string, tokenIn: string): Promise<{
        token0: string;
        reserve0: BigNumber;
        reserve1: BigNumber;
        balance: BigNumber;
    }>;
    _calculateOutput(reserve0: BigNumber, reserve1: BigNumber, amountIn: BigNumber, sellingToken0: boolean): BigNumber;
}
export {};
