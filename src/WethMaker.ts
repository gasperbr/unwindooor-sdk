import { BigNumber, Contract, constants } from 'ethers';
import { IUnwindorConstructorParams, Unwindooor } from './Unwindooor';
import UniV2Factory from "./abis/UniV2Factory.json";
import UniV2ABI from "./abis/UniV2.json";
import ERC20ABI from "./abis/ERC20.json";
import WethMakerABI from "./abis/WethMaker.json";

interface IWethMakerConstructorParams extends IUnwindorConstructorParams {
  wethAddress: string;
  sushiAddress: string;
  factoryAddress: string;
}

export class WethMaker extends Unwindooor {

  wethAddress!: string;
  sushiAddress!: string;
  factory!: Contract;
  maker!: Contract; // Weth or Sushi maker

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
  constructor(params: IWethMakerConstructorParams) {
    super(params);
    this.wethAddress = params.wethAddress;
    this.sushiAddress = params.sushiAddress;
    this.factory = new Contract(params.factoryAddress, UniV2Factory, params.provider);
    this.maker = new Contract(params.wethMakerAddress, WethMakerABI, params.provider);
  }

  /**
   * Calculate minimum out for selling into WETH.
   * @param tokenAddress Token we are selling.
   * @param unwindShare How much of our token balance we are selling. From 0 to 100 percent.
   */
  async sellToken(token: string, sellShare: BigNumber): Promise<{ amountIn: BigNumber; minimumOut: BigNumber }> {

    if (sellShare.lte(0) || sellShare.gt(100)) throw Error(`Valid values for sellShare are (0, 100])`);

    const pairAddress = await this._getPair(token);

    const { token0, reserve0, reserve1, balance } = await this._getMarketData(pairAddress, token);

    const sellingToken0 = token.toUpperCase() === token0.toUpperCase();

    const amountIn = balance.mul(sellShare).div(100);

    const minimumOut = this._calculateOutput(reserve0, reserve1, amountIn, sellingToken0);

    return { amountIn, minimumOut };

  }

  async _getPair(inToken: string): Promise<string> {

    let outToken;

    if (inToken.toUpperCase() === this.wethAddress.toUpperCase()) {

      outToken = this.sushiAddress;

    } else {

      const bridge = await this.maker.bridges(inToken);
      outToken = bridge === constants.AddressZero ? this.wethAddress : bridge;

    }

    const pairFor = await this.factory.getPair(inToken, outToken);

    if (pairFor === constants.AddressZero) throw Error(`No direct pair found for ${inToken} ${outToken}, you need to set a bridge`);

    return pairFor;
  }

  async _getMarketData(pairAddress: string, tokenIn: string): Promise<{
    token0: string;
    reserve0: BigNumber;
    reserve1: BigNumber;
    balance: BigNumber;
  }> {
    const pair = new Contract(pairAddress, UniV2ABI, this.provider);
    const token = new Contract(tokenIn, ERC20ABI, this.provider);
    const [
      token0,
      reserves,
      balance,
    ] = await Promise.all([
      pair.token0() as Promise<string>,
      pair.getReserves(),
      token.balanceOf(this.wethMakerAddress)
    ]);
    return { token0, reserve0: reserves._reserve0, reserve1: reserves._reserve1, balance };
  }

  _calculateOutput(
    reserve0: BigNumber,
    reserve1: BigNumber,
    amountIn: BigNumber,
    sellingToken0: boolean
  ): BigNumber {

    const reserveIn = sellingToken0 ? reserve0 : reserve1;
    const reserveOut = sellingToken0 ? reserve1 : reserve0;
    const noPriceImpactAmountOut = reserveOut.mul(amountIn).div(reserveIn); // out amount if no price impact happened
    const amountOut = this._getAmountOut(amountIn, reserveIn, reserveOut);
    this._checkPriceImpact(amountOut, noPriceImpactAmountOut);
    return this._addSlippage(amountOut);

  }
}