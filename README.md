### Sdk for [Sushi / Weth makers](https://github.com/gasperbr/unwindooor).
Calculates minimum output amounts.

Instalation:

`yarn add git+https://github.com/gasperbr/unwindooor-sdk.git`

Usage:

- instantiate class:
```
 const wethMaker = new WethMaker({
    wethMakerAddress,   // address of the WethMaker or SushiMaker contracts
    preferTokens,       // tokens we want to keep after removing liquidity [wethAddress, usdcAddress, ...]
    provider,           // ethers.Provider provider
    maxPriceImpact,     // Price impact we accept. (Will throw an error if exceeded)
    priceSlippage,      // Slippage we allow
    wethAddress,        // Weth9 address
    sushiAddress,       // Sushi address (only relevant when interacting with SushiMaker)
    factoryAddress      // Sushi factory address
  })
```
- calculate min out for removing liquidity:
```
wethMaker.unwindPair(pairAddress, share)
 ```
 
- calculate min out for selling tokens:
```
wethMaker.sellToken(token, share)
```
 
Where share is how much of the current balance we want to sell, from (0, 100].
