// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IStakingReceiver {
    function receiveRevenue() external payable;
}

contract TokenStakingNativeReward is IStakingReceiver {
    IERC20 public stakingToken;
    
    address public owner;
    uint256 public rewardRate = 2; // 0.02% per day (APY ~8%)
    uint256 public minimumStake = 1 ether; // 1 token minimum
    uint256 public rewardPool; // Native coin reward pool for APY
    
    // Bonus Revenue from Betting (separate from APY rewards)
    uint256 public totalBonusPool;           // Total bonus yang masuk
    uint256 public accBonusPerShare;         // Accumulated bonus per share (scaled by 1e18)
    uint256 private constant ACC_BONUS_PRECISION = 1e18;
    
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
        uint256 unclaimedRewards; // Snapshot rewards saat unstake
        uint256 bonusDebt;        // Untuk track bonus yang sudah di-claim
        uint256 totalBonusClaimed; // Total bonus yang sudah di-claim user
    }
    
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;
    
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 apyReward, uint256 bonusReward, uint256 timestamp);
    event RewardRateUpdated(uint256 newRate);
    event RewardsDeposited(uint256 amount);
    event BonusRevenueReceived(uint256 amount, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
        owner = msg.sender;
    }
    
    function stake(uint256 amount) external {
        require(amount >= minimumStake, "Amount below minimum");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        Stake storage userStake = stakes[msg.sender];
        
        // If user already has stake, snapshot pending rewards first
        if (userStake.amount > 0) {
            uint256 pending = _calculateActiveRewards(msg.sender);
            userStake.unclaimedRewards += pending;
            
            // Harvest bonus before changing amount
            uint256 pendingBonus = _calculatePendingBonus(msg.sender);
            if (pendingBonus > 0) {
                userStake.unclaimedRewards += pendingBonus; // Add bonus to unclaimed
            }
        }
        
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        userStake.bonusDebt = (userStake.amount * accBonusPerShare) / ACC_BONUS_PRECISION;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    function unstake(uint256 amount) external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");
        
        // Snapshot pending rewards SEBELUM amount berubah
        uint256 pending = _calculateActiveRewards(msg.sender);
        uint256 pendingBonus = _calculatePendingBonus(msg.sender);
        userStake.unclaimedRewards += pending + pendingBonus;
        userStake.lastClaimTime = block.timestamp;
        
        // Baru kurangi amount
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Update bonus debt
        userStake.bonusDebt = (userStake.amount * accBonusPerShare) / ACC_BONUS_PRECISION;
        
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
    
    function claimRewards() external {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address user) internal {
        Stake storage userStake = stakes[user];
        
        uint256 apyReward = _calculateActiveRewards(user) + userStake.unclaimedRewards;
        uint256 bonusReward = _calculatePendingBonus(user);
        uint256 totalReward = apyReward + bonusReward;
        
        if (totalReward > 0) {
            // Check if we have enough in pools
            uint256 apyFromPool = apyReward > rewardPool ? rewardPool : apyReward;
            uint256 bonusFromPool = bonusReward > totalBonusPool ? totalBonusPool : bonusReward;
            uint256 actualTotal = apyFromPool + bonusFromPool;
            
            require(actualTotal > 0, "No rewards available");
            
            userStake.lastClaimTime = block.timestamp;
            userStake.totalClaimed += apyFromPool;
            userStake.totalBonusClaimed += bonusFromPool;
            userStake.unclaimedRewards = 0;
            userStake.bonusDebt = (userStake.amount * accBonusPerShare) / ACC_BONUS_PRECISION;
            
            rewardPool -= apyFromPool;
            totalBonusPool -= bonusFromPool;
            
            // Send native coin as reward
            (bool success, ) = user.call{value: actualTotal}("");
            require(success, "Reward transfer failed");
            
            emit RewardsClaimed(user, apyFromPool, bonusFromPool, block.timestamp);
        }
    }
    
    // Receive bonus revenue from Match contracts
    function receiveRevenue() external payable override {
        require(msg.value > 0, "No revenue sent");
        
        if (totalStaked > 0) {
            // Distribute pro-rata to all stakers
            accBonusPerShare += (msg.value * ACC_BONUS_PRECISION) / totalStaked;
            totalBonusPool += msg.value;
            
            emit BonusRevenueReceived(msg.value, block.timestamp);
        } else {
            // No stakers, send to reward pool (or owner can withdraw later)
            rewardPool += msg.value;
        }
    }
    
    // Calculate active rewards (dari staking yang masih berjalan)
    function _calculateActiveRewards(address user) internal view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - userStake.lastClaimTime;
        return (userStake.amount * rewardRate * timeStaked) / (10000 * 1 days);
    }
    
    // Calculate pending bonus from betting revenue
    function _calculatePendingBonus(address user) internal view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 accumulatedBonus = (userStake.amount * accBonusPerShare) / ACC_BONUS_PRECISION;
        if (accumulatedBonus <= userStake.bonusDebt) return 0;
        
        return accumulatedBonus - userStake.bonusDebt;
    }
    
    // Calculate pending rewards (active + unclaimed) - for APY only
    function calculatePendingRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        
        // Active rewards dari staking yang masih berjalan
        uint256 activeRewards = _calculateActiveRewards(user);
        
        // Total = active + unclaimed (dari snapshot saat unstake)
        uint256 totalRewards = activeRewards + userStake.unclaimedRewards;
        
        // Cap reward at available pool
        if (totalRewards > rewardPool) {
            totalRewards = rewardPool;
        }
        
        return totalRewards;
    }
    
    // Calculate pending bonus revenue
    function calculatePendingBonus(address user) public view returns (uint256) {
        uint256 bonus = _calculatePendingBonus(user);
        if (bonus > totalBonusPool) {
            bonus = totalBonusPool;
        }
        return bonus;
    }
    
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 totalClaimed,
        uint256 pendingRewards,
        uint256 unlockTime,
        uint256 pendingBonus,
        uint256 totalBonusClaimed
    ) {
        Stake memory userStake = stakes[user];
        uint256 _pendingRewards = calculatePendingRewards(user);
        uint256 _pendingBonus = calculatePendingBonus(user);
        
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            userStake.totalClaimed,
            _pendingRewards,
            0, // No lock period, always unlocked
            _pendingBonus,
            userStake.totalBonusClaimed
        );
    }
    
    function getAPY() external view returns (uint256) {
        // APY = (rewardRate * 365) / 100
        return (rewardRate * 365) / 100;
    }
    
    // Get total bonus pool info
    function getBonusPoolInfo() external view returns (
        uint256 _totalBonusPool,
        uint256 _accBonusPerShare
    ) {
        return (totalBonusPool, accBonusPerShare);
    }
    
    // Owner functions
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Rate too high"); // Max 100%
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }
    
    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
    
    // Deposit native coin rewards
    function depositRewards() external payable onlyOwner {
        rewardPool += msg.value;
        emit RewardsDeposited(msg.value);
    }
    
    // Withdraw excess rewards
    function withdrawRewards(uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Insufficient reward pool");
        rewardPool -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    // Emergency withdraw staked tokens (only owner, for migration)
    function emergencyWithdrawStakedTokens(uint256 amount) external onlyOwner {
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // Receive function to accept native tokens for rewards
    receive() external payable {
        rewardPool += msg.value;
        emit RewardsDeposited(msg.value);
    }
}
