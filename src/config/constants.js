export const addresses = {
  factory: '0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C',
  weth: '0xf42548Ba89dc2314408f44b16506F88769abDED5',
  router: '0x313049192Cb0d4027A0De419a1dD169F9eFB48c7',
  multicall: '0x0A0197684eA1bEB450A73270Ac11E333e5b6a167',
};

export const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)"
];

export const routerAbi = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

export const factoryAbi = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

export const pairAbi = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

export const supportedNetworks = {
  '0x138B': {
    chainId: '0x138B',
    chainName: 'Mantle Testnet',
    rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
    nativeCurrency: { name: 'Mantle Testnet', symbol: 'MNT', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.mantlescan.xyz'],
    logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040'
  }
};

export const defaultToken = {
  address: '0xf42548Ba89dc2314408f44b16506F88769abDED5',
  symbol: 'MNT',
  name: 'Mantle Testnet',
  logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040',
  decimals: 18
};

export const embeddedTokenListData = {
  tokens: [
    {
      chainId: 5003,
      address: "0xE1010F50c511938699fDcac5520b0AdEd090b922",
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
      logoURI: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040"
    },
    {
      chainId: 5003,
      address: "0xBd5447Ff67852627c841bC695b99626BB60AcC8a",
      name: "IntellSwap",
      symbol: "INTEL",
      decimals: 18,
      logoURI: "/nxs.svg"
    }
  ]
};
