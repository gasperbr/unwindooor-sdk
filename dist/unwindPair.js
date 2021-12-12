"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._getMinimumOut = exports._keepToken0 = exports._getData = exports.unwindPair = void 0;
const ethers_1 = require("ethers");
const UniV2_json_1 = __importDefault(require("./abis/UniV2.json"));
/**
 * Makes one call to the multicall contract to calculate unwindPair input data.
 * @param params.pairAddress Address of the lp token we want to unwind.
 * @param params.wethMakerAddress Address of the sushi or weth maker.
 * @param params.preferTokens Addresses of tokens we want to unwind to (e.g. [SUSHI, WETH, USDC, USDT, DAI, WBTC]).
 * @param params.slippage Amount of slippage to account for when calculating minimumOutput (e.g. 0 is no slippage, 10 is 1%).
 * @param params.unwindShare Amount of lp tokens we want to unwind from 0% to 100% of available balance.
 */
async function unwindPair(params) {
    const { pairAddress, wethMakerAddress, preferTokens, provider, slippage, unwindShare } = params;
    if (unwindShare.lte(0) || unwindShare.gt(100))
        throw Error("Valid values for unwindShare are (0, 100] aka from 0% to 100%");
    if (slippage.lt(5) || slippage.gt(100))
        throw Error("Valid values for slippage are (5, 100] aka from 0.5% to 10%");
    const { token0, token1, reserve0, reserve1, lpAmount, totalSupply } = await _getData(pairAddress, wethMakerAddress, provider);
    const amount = lpAmount.mul(unwindShare).div(100);
    const keepToken0 = _keepToken0(token0, token1, preferTokens);
    const minimumOut = _getMinimumOut(reserve0, reserve1, amount, totalSupply, slippage, keepToken0);
    return { amount, minimumOut, keepToken0 };
}
exports.unwindPair = unwindPair;
async function _getData(pairAddress, wethMakerAddress, provider) {
    const pair = new ethers_1.Contract(pairAddress, UniV2_json_1.default, provider);
    const [token0, token1, reserves, balanceOf, totalSupply] = await Promise.all([
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
exports._getData = _getData;
function _keepToken0(t0, t1, preferTokens) {
    const index0 = preferTokens.indexOf(t0);
    const index1 = preferTokens.indexOf(t1);
    if (index1 == -1)
        return true;
    if (index0 == -1)
        return false;
    return index0 < index1;
}
exports._keepToken0 = _keepToken0;
function _getMinimumOut(reserve0, reserve1, amount, totalSupply, slippage, keepToken0) {
    const amount0 = amount.mul(reserve0).div(totalSupply);
    const amount1 = amount.mul(reserve1).div(totalSupply);
    reserve0 = reserve0.sub(amount0);
    reserve1 = reserve1.sub(amount1);
    let amountOut;
    if (keepToken0) {
        amountOut = amount0.add(_getAmountOut(amount1, reserve1, reserve0));
    }
    else {
        amountOut = amount1.add(_getAmountOut(amount0, reserve0, reserve1));
    }
    return amountOut.mul(ethers_1.BigNumber.from(1000).sub(slippage)).div(1000); // (e.g. 0 is no slippage, 5 is 0.5%)
}
exports._getMinimumOut = _getMinimumOut;
function _getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
}
