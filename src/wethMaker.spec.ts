import { providers, BigNumber, Contract } from "ethers";
import { WethMaker } from "./WethMaker";
import { WETH9_ADDRESS, FACTORY_ADDRESS, SUSHI_ADDRESS } from "@sushiswap/core-sdk"
import UniV2ABI from "./abis/UniV2.json";
import ERC20ABI from "./abis/ERC20.json";

const provider = new providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com");
const preferTokens = ["0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"];

const wethMaker = new WethMaker({
  wethMakerAddress: "0xCc159BCb6a466DA442D254Ad934125f05DAB66b5", // eoa
  preferTokens: preferTokens,
  provider: provider,
  maxPriceImpact: BigNumber.from(10), // 1%
  priceSlippage: BigNumber.from(2), // 0.2%
  wethAddress: WETH9_ADDRESS[137],
  sushiAddress: SUSHI_ADDRESS[137],
  factoryAddress: FACTORY_ADDRESS[137]
});

const _wethMaker = new WethMaker({
  wethMakerAddress: "0xBDF2E24bCCaDDb4Eb4893E164c935BfA561e7cd9", // actual weth maker contract
  preferTokens: preferTokens,
  provider: provider,
  maxPriceImpact: BigNumber.from(10), // 1%
  priceSlippage: BigNumber.from(2), // 0.2%
  wethAddress: WETH9_ADDRESS[137],
  sushiAddress: SUSHI_ADDRESS[137],
  factoryAddress: FACTORY_ADDRESS[137]
});

const wmaticQuickLp = "0x383be588327216586e131e63592a2dc976a16655";
const wmatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

test("gets data", async () => {

  const {
    token0,
    token1,
    reserve0,
    reserve1,
    lpAmount,
    totalSupply
  } = await wethMaker._getUnwindData(wmaticQuickLp);

  expect(token0.toUpperCase()).toBe("0X0D500B1D8E8EF31E21C99D1DB9A6444D3ADF1270");
  expect(token1.toUpperCase()).toBe("0X831753DD7087CAC61AB5644B308642CC1C33DC13");
  expect(reserve0.gt(0)).toBe(true);
  expect(reserve1.gt(0)).toBe(true);
  expect(lpAmount.gt(0)).toBe(true);
  expect(totalSupply.gt(0)).toBe(true);

});

test("returns preferable token", async () => {

  expect(wethMaker._keepToken0("a", "b", [])).toBe(true);
  expect(wethMaker._keepToken0("a", "b", ["a"])).toBe(true);
  expect(wethMaker._keepToken0("a", "b", ["b"])).toBe(false);
  expect(wethMaker._keepToken0("a", "b", ["a", "b"])).toBe(true);
  expect(wethMaker._keepToken0("a", "b", ["c", "a", "b"])).toBe(true);
  expect(wethMaker._keepToken0("a", "b", ["b", "a"])).toBe(false);
  expect(wethMaker._keepToken0("a", "b", ["c", "b", "a"])).toBe(false);

});

test("Calculates min amount out when unwinding", async () => {

  wethMaker.updatePriceSlippage(BigNumber.from(0)); // 0%
  const reserve0 = BigNumber.from(1000000); // 1m
  const reserve1 = BigNumber.from(1000000); // 1m
  const amount = BigNumber.from(5); // we have 0.5%
  const totalSupply = BigNumber.from(1000);
  const minimumOutA = wethMaker._getMinimumUnwindOut(reserve0, reserve1, amount, totalSupply, true);
  const minimumOutB = wethMaker._getMinimumUnwindOut(reserve0, reserve1, amount, totalSupply, false);
  const _amount0 = reserve0.mul(amount).div(totalSupply);
  const _amount0Bought = minimumOutA.sub(_amount0);

  expect(minimumOutA.toString()).toBe("9960");
  expect(minimumOutA.gt(_amount0)).toBe(true);
  expect(minimumOutA.lt(_amount0.mul(2))).toBe(true);
  expect(minimumOutA.toString()).toBe(minimumOutB.toString());

  wethMaker.updatePriceSlippage(BigNumber.from(10)); // 1%
  const minimumOutC = wethMaker._getMinimumUnwindOut(reserve0, reserve1, amount, totalSupply, true);
  expect(minimumOutC.toString()).toBe(_amount0.add(_amount0Bought.mul(99).div(100)).toString());

});

test("Protect against high price impact", async () => {
  wethMaker.updatePriceSlippage(BigNumber.from(0))
  const reserve0 = BigNumber.from(1000000); // 1m
  const reserve1 = BigNumber.from(1000000); // 1m
  const amount = BigNumber.from(1); // we have 1%
  const totalSupply = BigNumber.from(100);
  expect(() => wethMaker._getMinimumUnwindOut(reserve0, reserve1, amount, totalSupply, true)).toThrow("Max price impact exceeded");
});

test("Should calculate output", () => {
  const reserve0 = BigNumber.from(1000000); // 1m
  const reserve1 = BigNumber.from(2000000); // 1m
  let amountIn = BigNumber.from(100);
  expect(wethMaker._calculateOutput(reserve0, reserve1, amountIn, true).toString()).toBe("199");
  expect(wethMaker._calculateOutput(reserve0, reserve1, amountIn, false).toString()).toBe("49");
  amountIn = BigNumber.from(10000);
  expect(() => wethMaker._calculateOutput(reserve0, reserve1, amountIn, true)).toThrow("Max price impact exceeded");
  amountIn = BigNumber.from(20000);
  expect(() => wethMaker._calculateOutput(reserve0, reserve1, amountIn, false)).toThrow("Max price impact exceeded");
})

test("Should get market data", async () => {
  const data = await wethMaker._getMarketData(wmaticQuickLp, wmaticQuickLp);
  expect(data.token0).toBe(wmatic);
  expect(data.reserve0.gt(0)).toBeTruthy();
  expect(data.reserve1.gt(0)).toBeTruthy();
  expect(data.balance.gt(0)).toBeTruthy();
})

test("Should get pair", async () => {
  let pair = await _wethMaker._getPair("0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6");
  expect(pair).toBe("0xE62Ec2e799305E0D367b0Cc3ee2CdA135bF89816");
  await expect(_wethMaker._getPair(wmaticQuickLp)).rejects.toThrow(`No direct pair found for ${wmaticQuickLp} ${wethMaker.wethAddress}, you need to set a bridge`);
  pair = await _wethMaker._getPair(WETH9_ADDRESS[137]);
  expect(pair.toLowerCase()).toBe("0xb5846453b67d0b4b4ce655930cf6e4129f4416d7");
})

test("sell token", async () => {
  const balance = await (new Contract(usdc, ERC20ABI, provider)).balanceOf(_wethMaker.wethMakerAddress);
  if (balance.eq(0)) return;
  const { amountIn, minimumOut } = await _wethMaker.sellToken(usdc, BigNumber.from(1));
  const usdcWethLp = "0x34965ba0ac2451a34a0471f04cca3f990b8dea27";
  const reserves = await (new Contract(usdcWethLp, UniV2ABI, provider)).getReserves();
  const usdcReserve = reserves._reserve0 as BigNumber;
  const wethReserve = reserves._reserve1 as BigNumber;
  const calculatedOut = _wethMaker._getAmountOut(amountIn, usdcReserve, wethReserve);
  const calculatedMinOut = calculatedOut.mul(BigNumber.from(1000).sub(_wethMaker.priceSlippage)).div(1000)
  expect(calculatedMinOut.toString()).toBe(minimumOut.toString());
});