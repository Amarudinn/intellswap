// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IStakingReceiver.sol";

contract MatchNoDraw {
    address public owner;
    
    // Match info
    string public teamA;
    string public teamB;
    uint256 public matchStartTime;
    uint256 public bettingDeadline;
    
    // Team images (IPFS URLs)
    string public teamAImage;
    string public teamBImage;
    
    // Odds (100 = 1.0x, 180 = 1.8x, 250 = 2.5x)
    uint256 public oddsA;
    uint256 public oddsB;
    
    // Max bet limit (default 10 ETH)
    uint256 public maxBetAmount = 10 ether;
    
    // Betting pools
    uint256 public totalBetsA;
    uint256 public totalBetsB;
    
    // Owner liquidity tracking
    uint256 public ownerLiquidity;
    uint256 public totalOwnerDeposit; // Track total deposit untuk hitung profit
    
    // Staking addresses for revenue sharing
    address public nativeStaking;
    address public tokenStaking;
    
    // Revenue share percentages (in basis points, 1500 = 15%, 1000 = 10%)
    uint256 public nativeStakingShare = 1500; // 15% for testing
    uint256 public tokenStakingShare = 1000;  // 10% for testing
    uint256 public constant MIN_BONUS_THRESHOLD = 0.0001 ether; // Minimum bonus to distribute
    
    // Result: 0 = pending, 1 = team A, 2 = team B, 3 = cancelled
    uint8 public result = 0;
    bool public finalized = false;
    
    // User bets: user => choice => amount
    mapping(address => mapping(uint8 => uint256)) public userBets;
    mapping(address => bool) public hasClaimed;
    
    // Events
    event LiquidityDeposited(address indexed owner, uint256 amount);
    event BetPlaced(address indexed user, uint8 choice, uint256 amount);
    event ResultFinalized(uint8 result);
    event WinningsClaimed(address indexed user, uint256 amount);
    event ProfitWithdrawn(address indexed owner, uint256 amount, uint256 profit, uint256 bonusNative, uint256 bonusToken);
    event StakingAddressesUpdated(address nativeStaking, address tokenStaking);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        string memory _teamA,
        string memory _teamB,
        uint256 _matchStartTime,
        uint256 _oddsA,
        uint256 _oddsB,
        address _owner,
        address _nativeStaking,
        address _tokenStaking
    ) {
        teamA = _teamA;
        teamB = _teamB;
        matchStartTime = _matchStartTime;
        oddsA = _oddsA;
        oddsB = _oddsB;
        owner = _owner;
        nativeStaking = _nativeStaking;
        tokenStaking = _tokenStaking;
        
        // Betting closes 10 minutes before match
        bettingDeadline = _matchStartTime - 10 minutes;
    }
    
    // Set team images (IPFS URLs)
    function setTeamImages(string memory _teamAImage, string memory _teamBImage) external onlyOwner {
        teamAImage = _teamAImage;
        teamBImage = _teamBImage;
    }
    
    // Set max bet amount
    function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
        require(_maxBetAmount > 0, "Max bet must be greater than 0");
        maxBetAmount = _maxBetAmount;
    }
    
    // Update staking addresses (only owner)
    function setStakingAddresses(address _nativeStaking, address _tokenStaking) external onlyOwner {
        nativeStaking = _nativeStaking;
        tokenStaking = _tokenStaking;
        emit StakingAddressesUpdated(_nativeStaking, _tokenStaking);
    }
    
    // Owner deposits liquidity
    function depositLiquidity() external payable onlyOwner {
        require(block.timestamp < bettingDeadline, "Betting period ended");
        ownerLiquidity += msg.value;
        totalOwnerDeposit += msg.value; // Track total deposit
        emit LiquidityDeposited(msg.sender, msg.value);
    }
    
    // User places bet
    function bet(uint8 choice) external payable {
        require(block.timestamp < bettingDeadline, "Betting closed");
        require(!finalized, "Match finalized");
        require(choice >= 1 && choice <= 2, "Invalid choice");
        require(msg.value > 0, "Bet amount must be > 0");
        require(msg.value <= maxBetAmount, "Bet exceeds maximum allowed");
        
        // Calculate potential payout
        uint256 odds = (choice == 1) ? oddsA : oddsB;
        uint256 potentialPayout = (msg.value * odds) / 100;
        
        // Check if contract has enough liquidity (owner liquidity + all user bets)
        uint256 totalLiquidity = ownerLiquidity + totalBetsA + totalBetsB;
        require(potentialPayout <= totalLiquidity, "Insufficient liquidity");
        
        // Record bet
        userBets[msg.sender][choice] += msg.value;
        
        if (choice == 1) totalBetsA += msg.value;
        else totalBetsB += msg.value;
        
        emit BetPlaced(msg.sender, choice, msg.value);
    }
    
    // Owner finalizes result
    function finalizeResult(uint8 _result) external onlyOwner {
        require(block.timestamp >= matchStartTime, "Match not started");
        require(!finalized, "Already finalized");
        require(_result >= 1 && _result <= 3, "Invalid result");
        
        result = _result;
        finalized = true;
        
        emit ResultFinalized(_result);
    }
    
    // User claims winnings
    function claim() external {
        require(finalized, "Not finalized");
        require(!hasClaimed[msg.sender], "Already claimed");
        
        uint256 winAmount = 0;
        
        if (result == 3) {
            // Cancelled - refund all bets
            winAmount = userBets[msg.sender][1] + userBets[msg.sender][2];
        } else {
            // Normal result - pay winners
            uint256 betAmount = userBets[msg.sender][result];
            if (betAmount > 0) {
                uint256 odds = (result == 1) ? oddsA : oddsB;
                winAmount = (betAmount * odds) / 100;
            }
        }
        
        require(winAmount > 0, "No winnings");
        
        hasClaimed[msg.sender] = true;
        payable(msg.sender).transfer(winAmount);
        
        emit WinningsClaimed(msg.sender, winAmount);
    }
    
    // Owner withdraws profit with revenue sharing to stakers
    function withdrawProfit() external onlyOwner {
        require(finalized, "Not finalized");
        
        uint256 totalCollected = totalBetsA + totalBetsB;
        uint256 totalPaidOut = 0;
        
        if (result == 1) {
            totalPaidOut = (totalBetsA * oddsA) / 100;
        } else if (result == 2) {
            totalPaidOut = (totalBetsB * oddsB) / 100;
        } else if (result == 3) {
            // Cancelled - refund all
            totalPaidOut = totalCollected;
        }
        
        // Calculate withdrawable amount (handle loss case)
        uint256 withdrawable;
        uint256 profit = 0;
        
        if (totalPaidOut >= totalCollected) {
            // Owner lost money (payout >= collected)
            if (ownerLiquidity + totalCollected >= totalPaidOut) {
                withdrawable = ownerLiquidity + totalCollected - totalPaidOut;
            } else {
                withdrawable = 0;
            }
            // No profit, no bonus
        } else {
            // Owner made profit
            profit = totalCollected - totalPaidOut;
            withdrawable = ownerLiquidity + profit;
        }
        
        require(withdrawable > 0, "Nothing to withdraw");
        
        uint256 bonusNative = 0;
        uint256 bonusToken = 0;
        
        // Only distribute bonus if there's profit
        if (profit > 0) {
            // Calculate bonuses
            bonusNative = (profit * nativeStakingShare) / 10000; // 15%
            bonusToken = (profit * tokenStakingShare) / 10000;   // 10%
            
            // Send to Native Staking if above threshold and has stakers
            if (bonusNative >= MIN_BONUS_THRESHOLD && nativeStaking != address(0)) {
                try IStakingReceiver(nativeStaking).totalStaked() returns (uint256 staked) {
                    if (staked > 0) {
                        IStakingReceiver(nativeStaking).receiveRevenue{value: bonusNative}();
                    } else {
                        // No stakers, bonus goes to owner
                        bonusNative = 0;
                    }
                } catch {
                    // Contract call failed, bonus goes to owner
                    bonusNative = 0;
                }
            } else {
                bonusNative = 0;
            }
            
            // Send to Token Staking if above threshold and has stakers
            if (bonusToken >= MIN_BONUS_THRESHOLD && tokenStaking != address(0)) {
                try IStakingReceiver(tokenStaking).totalStaked() returns (uint256 staked) {
                    if (staked > 0) {
                        IStakingReceiver(tokenStaking).receiveRevenue{value: bonusToken}();
                    } else {
                        // No stakers, bonus goes to owner
                        bonusToken = 0;
                    }
                } catch {
                    // Contract call failed, bonus goes to owner
                    bonusToken = 0;
                }
            } else {
                bonusToken = 0;
            }
        }
        
        // Calculate final amount for owner (withdrawable minus distributed bonuses)
        uint256 ownerAmount = withdrawable - bonusNative - bonusToken;
        
        ownerLiquidity = 0;
        totalOwnerDeposit = 0;
        
        payable(owner).transfer(ownerAmount);
        
        emit ProfitWithdrawn(owner, ownerAmount, profit, bonusNative, bonusToken);
    }
    
    // View functions
    function getMatchInfo() external view returns (
        string memory _teamA,
        string memory _teamB,
        uint256 _matchStartTime,
        uint256 _bettingDeadline,
        uint256 _oddsA,
        uint256 _oddsB,
        uint8 _result,
        bool _finalized
    ) {
        return (
            teamA,
            teamB,
            matchStartTime,
            bettingDeadline,
            oddsA,
            oddsB,
            result,
            finalized
        );
    }
    
    function getBettingPools() external view returns (
        uint256 _totalBetsA,
        uint256 _totalBetsB,
        uint256 _ownerLiquidity
    ) {
        return (totalBetsA, totalBetsB, ownerLiquidity);
    }
    
    function getTeamImages() external view returns (
        string memory _teamAImage,
        string memory _teamBImage
    ) {
        return (teamAImage, teamBImage);
    }
    
    function getMaxBetAmount() external view returns (uint256) {
        return maxBetAmount;
    }
    
    function getUserBets(address user) external view returns (
        uint256 betA,
        uint256 betB,
        bool claimed
    ) {
        return (
            userBets[user][1],
            userBets[user][2],
            hasClaimed[user]
        );
    }
    
    function getStakingAddresses() external view returns (
        address _nativeStaking,
        address _tokenStaking
    ) {
        return (nativeStaking, tokenStaking);
    }
    
    function getRevenueShareInfo() external view returns (
        uint256 _nativeStakingShare,
        uint256 _tokenStakingShare,
        uint256 _totalOwnerDeposit
    ) {
        return (nativeStakingShare, tokenStakingShare, totalOwnerDeposit);
    }
    
    function isBettingOpen() external view returns (bool) {
        return block.timestamp < bettingDeadline && !finalized;
    }
    
    function getTimeLeft() external view returns (uint256) {
        if (block.timestamp >= bettingDeadline) return 0;
        return bettingDeadline - block.timestamp;
    }
}
