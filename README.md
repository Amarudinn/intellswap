# IntellSwap DeFi Platform

Your gateway to decentralized finance on Mantle Testnet Network — swap, stake, and predict with confidence.

## Features

### Swap & Pool
Instant token swaps with AMM. Provide liquidity and earn 0.3% fees on every trade.
- Token-to-token swaps via AMM
- Liquidity pool management (add/remove liquidity)
- Automatic price calculation
- Slippage protection
- Multi-hop routing through MNT

### Staking
Stake MNT or INTEL to earn APY rewards plus bonus revenue share from betting profits.

| Pool | Type | APY | Revenue Share |
|------|------|-----|---------------|
| MNT | Native | 14% | 15% |
| INTEL | ERC20 | 7% | 10% |

**Revenue Share System:**
When match owner withdraws betting profit, a percentage is distributed to stakers:
- 15% of profit → MNT stakers
- 10% of profit → INTEL stakers
- Revenue distributed pro-rata based on stake amount

> ⚠️ **Important:** Revenue share only applies when owner makes profit. If owner loses, stakers receive nothing from that match.

### Prediction (Sports Betting)
Bet on sports matches with fixed odds. Fully on-chain and trustless.

**Betting Rules:**
- Users can only bet on matches with "Upcoming" status
- Betting closes 10 minutes before match starts
- Multiple bets allowed on same match
- No cancellation once bet is placed

## Network Information

| Property | Value |
|----------|-------|
| Network | Mantle Testnet |
| Chain ID | 5003 |
| Native Token | MNT |
| RPC URL | https://rpc.sepolia.mantle.xyz |
| Explorer | https://sepolia.mantlescan.xyz |

## Smart Contracts

### Staking Contracts
- **NativeStaking.sol** - Stake MNT to earn 14% APY + 15% revenue share
- **TokenStakingNativeReward.sol** - Stake ERC20 tokens (INTEL) to earn APY + revenue share

### Betting Contracts
- **MasterFactory.sol** - Central registry to manage all SportsBettingFactory contracts
- **SportsBettingFactory.sol** - Creates and manages betting matches, handles staking integration
- **MatchWithDraw.sol** - Match with Team A, Draw, Team B options (e.g., Football)
- **MatchNoDraw.sol** - Match with Team A, Team B options only (e.g., Basketball, Tennis)

### Deployed Addresses (Mantle Testnet)

| Contract | Address |
|----------|---------|
| NativeStaking | `0x6a9f145369B37FD34B0B079E22294CcD0126eD3A` |
| TokenStakingNativeReward | `0x37174CbFaf4C595b113E5556a3eb64e35516a9ef` |
| MasterFactory | `0xFD8781340934aBCA7F205992B7316304A6c9f242` |


## Contract Functions

### MasterFactory.sol
- `addFactory()` - Register existing factory
- `getActiveFactories()` - Get all active factories

### SportsBettingFactory.sol
- `createMatchWithDraw()` - Create match with 3 outcomes (Team A, Draw, Team B)
- `createMatchNoDraw()` - Create match with 2 outcomes (Team A, Team B)
- `setStakingAddresses()` - Set staking for revenue share
- `getAllMatchesWithDraw()` - Get all matches with draw
- `getAllMatchesNoDraw()` - Get all matches without draw

### MatchWithDraw.sol / MatchNoDraw.sol
- `depositLiquidity()` - Owner deposits initial liquidity
- `bet()` - User places bet on outcome
- `finalizeResult()` - Owner sets match result
- `claim()` - User claims winnings
- `withdrawProfit()` - Owner withdraws profit + revenue share

## Getting Started

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run development server
npm run dev
```

## Tech Stack
- React + Vite
- Wagmi + RainbowKit
- TailwindCSS
- Solidity Smart Contracts

## License
MIT
