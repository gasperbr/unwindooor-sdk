import { BigNumber, providers } from 'ethers';
interface InputData {
    pairAddress: string;
    wethMakerAddress: string;
    preferTokens: string[];
    provider: providers.Provider;
    slippage: BigNumber;
    unwindShare: BigNumber;
}
interface ReturnData {
    amount: BigNumber;
    minimumOut: BigNumber;
    keepToken0: boolean;
}
/**
 * Makes one call to the multicall contract to calculate unwindPair input data.
 * @param params.pairAddress Address of the lp token we want to unwind.
 * @param params.wethMakerAddress Address of the sushi or weth maker.
 * @param params.preferTokens Addresses of tokens we want to unwind to (e.g. [SUSHI, WETH, USDC, USDT, DAI, WBTC]).
 * @param params.slippage Amount of slippage to account for when calculating minimumOutput (e.g. 0 is no slippage, 10 is 1%).
 * @param params.unwindShare Amount of lp tokens we want to unwind from 0% to 100% of available balance.
 */
export declare function unwindPair(params: InputData): Promise<ReturnData>;
export declare function _getData(pairAddress: string, wethMakerAddress: string, provider: providers.Provider): Promise<{
    token0: string;
    token1: string;
    reserve0: BigNumber;
    reserve1: BigNumber;
    lpAmount: BigNumber;
    totalSupply: BigNumber;
}>;
export declare function _keepToken0(t0: string, t1: string, preferTokens: string[]): boolean;
export declare function _getMinimumOut(reserve0: BigNumber, reserve1: BigNumber, amount: BigNumber, totalSupply: BigNumber, slippage: BigNumber, keepToken0: boolean): BigNumber;
export {};
