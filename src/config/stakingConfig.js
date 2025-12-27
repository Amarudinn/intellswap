// Staking contract addresses
export const stakingAddresses = {
  nativeStaking: '0xD642Fb88DA5Bd4e7d90F829298Ee12dda158A1d7', // Replace with deployed NativeStaking address
  tokenStaking: '0x91F193c3F24BaE45A0c592E7833354DE00A872C2', // Replace with deployed TokenStaking address
};

// Native Staking contract ABI (with bonus revenue)
export const nativeStakingAbi = [
  "function stake() external payable",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function calculatePendingRewards(address user) external view returns (uint256)",
  "function calculatePendingBonus(address user) external view returns (uint256)",
  "function getStakeInfo(address user) external view returns (uint256 amount, uint256 startTime, uint256 lastClaimTime, uint256 totalClaimed, uint256 pendingRewards, uint256 unlockTime, uint256 pendingBonus, uint256 totalBonusClaimed)",
  "function getBonusPoolInfo() external view returns (uint256 totalBonusPool, uint256 accBonusPerShare)",
  "function getAPY() external view returns (uint256)",
  "function totalStaked() external view returns (uint256)",
  "function rewardPool() external view returns (uint256)",
  "function totalBonusPool() external view returns (uint256)",
  "function minimumStake() external view returns (uint256)",
  "function lockPeriod() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "function receiveRevenue() external payable",
  "event Staked(address indexed user, uint256 amount, uint256 timestamp)",
  "event Unstaked(address indexed user, uint256 amount, uint256 timestamp)",
  "event RewardsClaimed(address indexed user, uint256 apyReward, uint256 bonusReward, uint256 timestamp)",
  "event BonusRevenueReceived(uint256 amount, uint256 timestamp)"
];

// Token Staking contract ABI (with bonus revenue)
export const tokenStakingAbi = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function calculatePendingRewards(address user) external view returns (uint256)",
  "function calculatePendingBonus(address user) external view returns (uint256)",
  "function getStakeInfo(address user) external view returns (uint256 amount, uint256 startTime, uint256 lastClaimTime, uint256 totalClaimed, uint256 pendingRewards, uint256 unlockTime, uint256 pendingBonus, uint256 totalBonusClaimed)",
  "function getBonusPoolInfo() external view returns (uint256 totalBonusPool, uint256 accBonusPerShare)",
  "function getAPY() external view returns (uint256)",
  "function stakingToken() external view returns (address)",
  "function rewardToken() external view returns (address)",
  "function totalStaked() external view returns (uint256)",
  "function totalBonusPool() external view returns (uint256)",
  "function minimumStake() external view returns (uint256)",
  "function lockPeriod() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "function receiveRevenue() external payable",
  "event Staked(address indexed user, uint256 amount, uint256 timestamp)",
  "event Unstaked(address indexed user, uint256 amount, uint256 timestamp)",
  "event RewardsClaimed(address indexed user, uint256 apyReward, uint256 bonusReward, uint256 timestamp)",
  "event BonusRevenueReceived(uint256 amount, uint256 timestamp)"
];

// ERC20 ABI for token operations
export const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)"
];

// Supported staking pools
export const stakingPools = [
  {
    id: 'native',
    name: 'MNT',
    type: 'native', // 'native' or 'token'
    stakingToken: {
      address: 'native', // Special identifier for native coin
      symbol: 'MNT',
      name: 'MNT',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040'
    },
    rewardToken: {
      address: 'native',
      symbol: 'MNT',
      name: 'MNT',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040'
    },
    contractAddress: '0xD642Fb88DA5Bd4e7d90F829298Ee12dda158A1d7', // Replace with NativeStaking address
    apy: 14,
    revenueShare: 15, // 15% dari profit betting
    minimumStake: 0.01,
    active: true,
    description: 'Stake native MNT tokens directly'
  },
  {
    id: 'intellswap',
    name: 'INTEL',
    type: 'token', // 'native' or 'token'
    stakingToken: {
      address: '0xBd5447Ff67852627c841bC695b99626BB60AcC8a', // INTEL ERC20 token
      symbol: 'INTEL',
      name: 'IntellSwap',
      decimals: 18,
      logoURI: '/nxs.svg'
    },
    rewardToken: {
      address: 'native', // Reward in native MNT
      symbol: 'MNT',
      name: 'MNT',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040'
    },
    contractAddress: '0x91F193c3F24BaE45A0c592E7833354DE00A872C2', // Replace with TokenStaking address
    apy: 7,
    revenueShare: 10, // Tidak dapat revenue share
    minimumStake: 1,
    active: true,
    description: 'Stake INTEL, earn MNT rewards'
  },
  {
    id: 'usdc',
    name: 'USDC',
    type: 'token', // 'native' or 'token'
    stakingToken: {
      address: '0xE1010F50c511938699fDcac5520b0AdEd090b922', // Your USDC token
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    rewardToken: {
      address: 'native', // Reward in native MNT
      symbol: 'MNT',
      name: 'MNT',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040'
    },
    contractAddress: '0xB8ADd9fFDA88b7ED72371B30710B60362082B070', // Replace with TokenStaking address for USDC
    apy: 7,
    minimumStake: 1,
    active: true,
    description: 'Stake USDC, earn MNT rewards'
  },
  // Add more pools here (other ERC20 tokens)
];
