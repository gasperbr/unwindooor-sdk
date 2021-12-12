// hello.spec.ts
import { unwindPair, _getData, _getMinimumOut, _keepToken0 } from './unwindPair'
import { providers, BigNumber } from "ethers";

test('gets data', async () => {

  const {
    token0,
    token1,
    reserve0,
    reserve1,
    lpAmount,
    totalSupply
  } = await _getData(
    "0x383be588327216586e131e63592a2dc976a16655",
    "0xCc159BCb6a466DA442D254Ad934125f05DAB66b5",
    new providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com") as any
  );

  expect(token0.toUpperCase()).toBe("0X0D500B1D8E8EF31E21C99D1DB9A6444D3ADF1270");
  expect(token1.toUpperCase()).toBe("0X831753DD7087CAC61AB5644B308642CC1C33DC13");
  expect(reserve0.gt(0)).toBe(true);
  expect(reserve1.gt(0)).toBe(true);
  expect(lpAmount.gt(0)).toBe(true);
  expect(totalSupply.gt(0)).toBe(true);

});

test('returns preferable token', async () => {

  expect(_keepToken0("a", "b", [])).toBe(true);
  expect(_keepToken0("a", "b", ["a"])).toBe(true);
  expect(_keepToken0("a", "b", ["b"])).toBe(false);
  expect(_keepToken0("a", "b", ["a", "b"])).toBe(true);
  expect(_keepToken0("a", "b", ["c", "a", "b"])).toBe(true);
  expect(_keepToken0("a", "b", ["b", "a"])).toBe(false);
  expect(_keepToken0("a", "b", ["c", "b", "a"])).toBe(false);

});

test('Calculates min amount out', async () => {

  const reserve0 = BigNumber.from(1000000); // 1m
  const reserve1 = BigNumber.from(1000000); // 1m
  const amount = BigNumber.from(50); // we have 5%
  const totalSupply = BigNumber.from(1000);
  const slippage = BigNumber.from(0);
  const minimumOutA = _getMinimumOut(reserve0, reserve1, amount, totalSupply, slippage, true);
  const minimumOutB = _getMinimumOut(reserve0, reserve1, amount, totalSupply, slippage, false);
  const _amount0 = reserve0.mul(amount).div(totalSupply);
  expect(minimumOutA.toString()).toBe("97364");
  expect(minimumOutA.gt(_amount0)).toBe(true);
  expect(minimumOutA.lt(_amount0.mul(2))).toBe(true);
  expect(minimumOutA.toString()).toBe(minimumOutB.toString());
  const minimumOutC = _getMinimumOut(reserve0, reserve1, amount, totalSupply, BigNumber.from(10), true);
  expect(minimumOutC.toString()).toBe(minimumOutA.mul(99).div(100).toString());

});
