// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TokenStaking {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    address public owner;
    uint256 public rewardRate = 100; // 1% per day (100 basis points)
    uint256 public lockPeriod = 7 days;
    uint256 public minimumStake = 1 ether; // 1 token minimum
    
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
    }
    
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;
    
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event RewardRateUpdated(uint256 newRate);
    event LockPeriodUpdated(uint256 newPeriod);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        owner = msg.sender;
    }
    
    function stake(uint256 amount) external {
        require(amount >= minimumStake, "Amount below minimum");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        Stake storage userStake = stakes[msg.sender];
        
        // If user already has stake, claim pending rewards first
        if (userStake.amount > 0) {
            _claimRewards(msg.sender);
        }
        
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    function unstake(uint256 amount) external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");
        require(block.timestamp >= userStake.startTime + lockPeriod, "Lock period not ended");
        
        // Claim pending rewards before unstaking
        _claimRewards(msg.sender);
        
        userStake.amount -= amount;
        totalStaked -= amount;
        
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
    
    function claimRewards() external {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address user) internal {
        Stake storage userStake = stakes[user];
        uint256 pending = calculatePendingRewards(user);
        
        if (pending > 0) {
            userStake.lastClaimTime = block.timestamp;
            userStake.totalClaimed += pending;
            
            require(rewardToken.transfer(user, pending), "Reward transfer failed");
            
            emit RewardsClaimed(user, pending, block.timestamp);
        }
    }
    
    function calculatePendingRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - userStake.lastClaimTime;
        uint256 reward = (userStake.amount * rewardRate * timeStaked) / (10000 * 1 days);
        
        return reward;
    }
    
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 totalClaimed,
        uint256 pendingRewards,
        uint256 unlockTime
    ) {
        Stake memory userStake = stakes[user];
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            userStake.totalClaimed,
            calculatePendingRewards(user),
            userStake.startTime + lockPeriod
        );
    }
    
    function getAPY() external view returns (uint256) {
        // APY = (rewardRate * 365) / 100
        return (rewardRate * 365) / 100;
    }
    
    // Owner functions
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Rate too high"); // Max 100%
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }
    
    function setLockPeriod(uint256 newPeriod) external onlyOwner {
        lockPeriod = newPeriod;
        emit LockPeriodUpdated(newPeriod);
    }
    
    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
    
    function depositRewards(uint256 amount) external onlyOwner {
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
    
    function withdrawRewards(uint256 amount) external onlyOwner {
        require(rewardToken.transfer(msg.sender, amount), "Transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
