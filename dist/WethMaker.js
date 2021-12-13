"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WethMaker = void 0;
const ethers_1 = require("ethers");
const Unwindooor_1 = require("./Unwindooor");
const UniV2Factory_json_1 = __importDefault(require("./abis/UniV2Factory.json"));
const UniV2_json_1 = __importDefault(require("./abis/UniV2.json"));
const ERC20_json_1 = __importDefault(require("./abis/ERC20.json"));
const WethMaker_json_1 = __importDefault(require("./abis/WethMaker.json"));
class WethMaker extends Unwindooor_1.Unwindooor {
    /**
      * @param params.wethMakerAddress Address of the sushi or weth maker.
      * @param params.preferTokens Addresses of tokens we prefer to to unwind to (e.g. [SUSHI, WETH, USDC]).
      * @param params.provider instance of ethers.providers.Provider class.
      * @param params.maxPriceImpact Price impact we accept. Default is 1%, throws error if exceeded.
      *  Use 10 for 1%, 5 for 0.5%. Can indicate we need to setup a bridge for a token.
      * @param params.priceSlippage Slippage we add on top of minimum out. Use 0 for none, 10 for 1%;
      * @param params.wethAddress Wrapped Ethereum address.
      * @param params.factoryAddress Sushi factory address.
      */
    constructor(params) {
        super(params);
        this.wethAddress = params.wethAddress;
        this.factory = new ethers_1.Contract(params.factoryAddress, UniV2Factory_json_1.default, params.provider);
        this.maker = new ethers_1.Contract(params.wethMakerAddress, WethMaker_json_1.default, params.provider);
    }
    /**
     * Calculate minimum out for selling into WETH.
     * @param tokenAddress Token we are selling.
     * @param unwindShare How much of our token balance we are selling. From 0 to 100 percent.
     */
    async sellToken(token, sellShare) {
        if (sellShare.lte(0) || sellShare.gt(100))
            throw Error(`Valid values for sellShare are (0, 100])`);
        const pairAddress = await this._getPair(token);
        const { token0, reserve0, reserve1, balance } = await this._getMarketData(pairAddress, token);
        const sellingToken0 = token.toUpperCase() === token0.toUpperCase();
        const amountIn = balance.mul(sellShare).div(100);
        const minimumOut = this._calculateOutput(reserve0, reserve1, amountIn, sellingToken0);
        return { amountIn, minimumOut };
    }
    async _getPair(inToken) {
        const bridge = await this.maker.bridges(inToken);
        const outToken = bridge === ethers_1.constants.AddressZero ? this.wethAddress : bridge;
        const pairFor = await this.factory.getPair(inToken, outToken);
        if (pairFor === ethers_1.constants.AddressZero)
            throw Error(`No direct pair found for ${inToken} ${outToken}, you need to set a bridge`);
        return pairFor;
    }
    async _getMarketData(pairAddress, tokenIn) {
        const pair = new ethers_1.Contract(pairAddress, UniV2_json_1.default, this.provider);
        const token = new ethers_1.Contract(tokenIn, ERC20_json_1.default, this.provider);
        const [token0, reserves, balance,] = await Promise.all([
            pair.token0(),
            pair.getReserves(),
            token.balanceOf(this.wethMakerAddress)
        ]);
        return { token0, reserve0: reserves._reserve0, reserve1: reserves._reserve1, balance };
    }
    _calculateOutput(reserve0, reserve1, amountIn, sellingToken0) {
        const reserveIn = sellingToken0 ? reserve0 : reserve1;
        const reserveOut = sellingToken0 ? reserve1 : reserve0;
        const noPriceImpactAmountOut = reserveOut.mul(amountIn).div(reserveIn); // out amount if no price impact happened
        const amountOut = this._getAmountOut(amountIn, reserveIn, reserveOut);
        this._checkPriceImpact(amountOut, noPriceImpactAmountOut);
        return this._addSlippage(amountOut);
    }
}
exports.WethMaker = WethMaker;
