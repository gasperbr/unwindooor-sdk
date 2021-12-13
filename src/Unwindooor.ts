import { BigNumber, Contract, providers } from 'ethers';
import UniV2ABI from "./abis/UniV2.json";

export interface IUnwindorConstructorParams {
  wethMakerAddress: string;
  preferTokens: string[];
  provider: providers.Provider;
  maxPriceImpact: BigNumber;
  priceSlippage: BigNumber;
}

interface UnwindPairData {
  amount: BigNumber,
  minimumOut: BigNumber,
  keepToken0: boolean
}

export abstract class Unwindooor {

  wethMakerAddress!: string;
  preferTokens!: string[];
  provider!: providers.Provider;
  maxPriceImpact!: BigNumber;
  priceSlippage!: BigNumber;

  /**
    * @param params.wethMakerAddress Address of the sushi or weth maker.
    * @param params.preferTokens Addresses of tokens we prefer to to unwind to (e.g. [SUSHI, WETH, USDC]).
    * @param params.provider instance of ethers.providers.Provider class.
    * @param params.maxPriceImpact Price impact we accept. Default is 1%, throws error if exceeded.
    *  Use 10 for 1%, 5 for 0.5%. Can indicate we need to setup a bridge for a token.
    * @param params.priceSlippage Slippage we add on top of minimum out. Use 0 for none, 10 for 1%;
    */
  constructor({
    wethMakerAddress,
    preferTokens,
    provider,
    maxPriceImpact,
    priceSlippage
  }: IUnwindorConstructorParams) {
    this.wethMakerAddress = wethMakerAddress;
    this.preferTokens = preferTokens;
    this.provider = provider;
    this.maxPriceImpact = maxPriceImpact;
    this.priceSlippage = priceSlippage;
  }

  updatePriceSlippage(amount: BigNumber) {
    this.priceSlippage = amount;
  }

  /**
   * Calculate minimum output for unwinding a given pair
   * @param pairAddress Pair address.
   * @param unwindShare How much of our lp tokens we want to unwind. From 0 to 100 percent.
   */
  async unwindPair(pairAddress: string, unwindShare: BigNumber): Promise<UnwindPairData> {

    if (unwindShare.lte(0) || unwindShare.gt(100)) throw Error(`Valid values for unwindShare are (0, 100])`);

    const { token0, token1, reserve0, reserve1, lpAmount, totalSupply } = await this._getUnwindData(pairAddress);

    const amount = lpAmount.mul(unwindShare).div(100);

    const keepToken0 = this._keepToken0(token0, token1, this.preferTokens);

    const minimumOut = this._getMinimumUnwindOut(reserve0, reserve1, amount, totalSupply, keepToken0);

    return { amount, minimumOut, keepToken0 };

  }

  async _getUnwindData(pairAddress: string): Promise<{
    token0: string;
    token1: string;
    reserve0: BigNumber;
    reserve1: BigNumber;
    lpAmount: BigNumber;
    totalSupply: BigNumber
  }> {
    const pair = new Contract(pairAddress, UniV2ABI, this.provider);
    const [
      token0,
      token1,
      reserves,
      lpAmount,
      totalSupply
    ] = await Promise.all([ // potentially replace this with multicall
      pair.token0(),
      pair.token1(),
      pair.getReserves(),
      pair.balanceOf(this.wethMakerAddress),
      pair.totalSupply()
    ]);
    const reserve0 = reserves._reserve0;
    const reserve1 = reserves._reserve1;
    return { token0, token1, reserve0, reserve1, lpAmount, totalSupply };
  }

  _keepToken0(t0: string, t1: string, preferTokens: string[]): boolean {
    const index0 = preferTokens.indexOf(t0);
    const index1 = preferTokens.indexOf(t1);
    if (index1 == -1) return true;
    if (index0 == -1) return false;
    return index0 < index1;
  }

  _getMinimumUnwindOut(
    reserve0: BigNumber,
    reserve1: BigNumber,
    amount: BigNumber,
    totalSupply: BigNumber,
    keepToken0: boolean
  ): BigNumber {
    const amount0 = amount.mul(reserve0).div(totalSupply);
    const amount1 = amount.mul(reserve1).div(totalSupply);

    reserve0 = reserve0.sub(amount0);
    reserve1 = reserve1.sub(amount1);

    let amountOut;
    if (keepToken0) {

      amountOut = this._getAmountOut(amount1, reserve1, reserve0);
      this._checkPriceImpact(amountOut, amount0);
      amountOut = this._addSlippage(amountOut).add(amount0);

    } else {

      amountOut = this._getAmountOut(amount0, reserve0, reserve1);
      this._checkPriceImpact(amountOut, amount1);
      amountOut = this._addSlippage(amountOut).add(amount1);

    }

    return amountOut;
  }

  _getAmountOut(
    amountIn: BigNumber,
    reserveIn: BigNumber,
    reserveOut: BigNumber
  ): BigNumber {
    const amountInWithFee = amountIn.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
  }

  _addSlippage(amount: BigNumber): BigNumber {
    if (this.priceSlippage.lt(0) || this.priceSlippage.gt(30)) {
      throw Error(`Valid values for price slippage are [0, 30] aka 0 to 3%`);
    }
    return amount.mul(BigNumber.from(1000).sub(this.priceSlippage)).div(1000);
  }

  _checkPriceImpact(outAmount: BigNumber, perfectOut: BigNumber): void {
    if (this.maxPriceImpact.lte(0) || this.maxPriceImpact.gt(60)) {
      throw Error(`Valid valies for price impact are (0, 60) aka 0 to 6%`);
    }
    if (outAmount.lt(perfectOut.mul(BigNumber.from(1000).sub(this.maxPriceImpact)).div(1000))) {
      throw Error(`Max price impact exceeded`);
    }
  }

}