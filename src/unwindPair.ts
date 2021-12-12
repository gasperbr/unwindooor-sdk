import { BigNumber, Contract, providers } from 'ethers';
import UniV2ABI from "./abis/UniV2.json";

interface InputData {
  pairAddress: string,
  wethMakerAddress: string,
  preferTokens: string[],
  provider: providers.Provider,
  slippage: BigNumber,
  unwindShare: BigNumber
}

interface ReturnData {
  amount: BigNumber,
  minimumOut: BigNumber,
  keepToken0: boolean
}

/**
 * Makes one call to the multicall contract to calculate unwindPair input data.
 * @param params.pairAddress Address of the lp token we want to unwind.
 * @param params.wethMakerAddress Address of the sushi or weth maker.
 * @param params.preferTokens Addresses of tokens we want to unwind to (e.g. [SUSHI, WETH, USDC, USDT, DAI, WBTC]).
 * @param params.slippage Amount of slippage to account for when calculating minimumOutput (e.g. 0 is no slippage, 10 is 1%).
 * @param params.unwindShare Amount of lp tokens we want to unwind from 0% to 100% of available balance.
 */
export async function unwindPair(params: InputData): Promise<ReturnData> {

  const { pairAddress, wethMakerAddress, preferTokens, provider, slippage, unwindShare } = params;

  if (unwindShare.lte(0) || unwindShare.gt(100)) throw Error("Valid values for unwindShare are (0, 100] aka from 0% to 100%");

  if (slippage.lt(5) || slippage.gt(100)) throw Error("Valid values for slippage are (5, 100] aka from 0.5% to 10%");

  const { token0, token1, reserve0, reserve1, lpAmount, totalSupply } = await _getData(pairAddress, wethMakerAddress, provider);

  const amount = lpAmount.mul(unwindShare).div(100);

  const keepToken0 = _keepToken0(token0, token1, preferTokens)

  const minimumOut = _getMinimumOut(reserve0, reserve1, amount, totalSupply, slippage, keepToken0);

  return { amount, minimumOut, keepToken0 }

}

export async function _getData(pairAddress: string, wethMakerAddress: string, provider: providers.Provider): Promise<{
  token0: string;
  token1: string;
  reserve0: BigNumber;
  reserve1: BigNumber;
  lpAmount: BigNumber;
  totalSupply: BigNumber
}> {

  const pair = new Contract(pairAddress, UniV2ABI, provider);

  const [
    token0,
    token1,
    reserves,
    balanceOf,
    totalSupply
  ] = await Promise.all([ // potentially replace this with multicall
    pair.token0(),
    pair.token1(),
    pair.getReserves(),
    pair.balanceOf(wethMakerAddress),
    pair.totalSupply()
  ]);

  const reserve0 = reserves._reserve0;
  const reserve1 = reserves._reserve1;

  return { token0, token1, reserve0, reserve1, lpAmount: balanceOf, totalSupply };
}

export function _keepToken0(t0: string, t1: string, preferTokens: string[]): boolean {
  const index0 = preferTokens.indexOf(t0);
  const index1 = preferTokens.indexOf(t1);
  if (index1 == -1) return true;
  if (index0 == -1) return false;
  return index0 < index1;
}

export function _getMinimumOut(
  reserve0: BigNumber,
  reserve1: BigNumber,
  amount: BigNumber,
  totalSupply: BigNumber,
  slippage: BigNumber,
  keepToken0: boolean
): BigNumber {
  const amount0 = amount.mul(reserve0).div(totalSupply);
  const amount1 = amount.mul(reserve1).div(totalSupply);
  reserve0 = reserve0.sub(amount0);
  reserve1 = reserve1.sub(amount1);

  let amountOut;
  if (keepToken0) {
    amountOut = amount0.add(_getAmountOut(amount1, reserve1, reserve0));
  } else {
    amountOut = amount1.add(_getAmountOut(amount0, reserve0, reserve1));
  }
  return amountOut.mul(BigNumber.from(1000).sub(slippage)).div(1000); // (e.g. 0 is no slippage, 5 is 0.5%)
}

function _getAmountOut(
  amountIn: BigNumber,
  reserveIn: BigNumber,
  reserveOut: BigNumber
): BigNumber {
  const amountInWithFee = amountIn.mul(997);
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(1000).add(amountInWithFee);
  return numerator.div(denominator);
}