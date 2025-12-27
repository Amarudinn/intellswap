// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Minimal interface for Match contracts
interface IMatch {
    function finalized() external view returns (bool);
    function owner() external view returns (address);
}

contract SportsBettingFactory {
    address public owner;
    
    // Staking addresses for revenue sharing (set once, used for all matches)
    address public nativeStaking;
    address public tokenStaking;
    
    // Deployed match contract templates (set by owner)
    address public matchWithDrawTemplate;
    address public matchNoDrawTemplate;
    
    // Arrays to track all created matches
    address[] public allMatchesWithDraw;
    address[] public allMatchesNoDraw;
    
    // Mapping to track active status and league
    mapping(address => bool) public isMatchActive;
    mapping(address => string) public matchLeague;
    
    // Events
    event MatchWithDrawCreated(
        address indexed matchAddress,
        string homeTeam,
        string awayTeam,
        uint256 matchStartTime,
        uint256 indexed timestamp
    );
    
    event MatchNoDrawCreated(
        address indexed matchAddress,
        string teamA,
        string teamB,
        uint256 matchStartTime,
        uint256 indexed timestamp
    );
    
    event MatchStatusChanged(
        address indexed matchAddress,
        bool isActive
    );
    
    event StakingAddressesUpdated(
        address nativeStaking,
        address tokenStaking
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set staking addresses for revenue sharing (call once after deploying staking contracts)
     */
    function setStakingAddresses(address _nativeStaking, address _tokenStaking) external onlyOwner {
        nativeStaking = _nativeStaking;
        tokenStaking = _tokenStaking;
        emit StakingAddressesUpdated(_nativeStaking, _tokenStaking);
    }
    
    /**
     * @dev Get current staking addresses
     */
    function getStakingAddresses() external view returns (address _nativeStaking, address _tokenStaking) {
        return (nativeStaking, tokenStaking);
    }
    
    /**
     * @dev Create match with draw option using CREATE2-like deployment
     */
    function createMatchWithDraw(
        string memory league,
        string memory homeTeam,
        string memory awayTeam,
        uint256 matchStartTime,
        uint256 oddsHome,
        uint256 oddsAway,
        uint256 oddsDraw
    ) external onlyOwner returns (address) {
        require(matchStartTime > block.timestamp - 7 days, "Match time too far in the past");
        require(oddsHome >= 100 && oddsAway >= 100 && oddsDraw >= 100, "Odds must be >= 1.0x");
        
        // Deploy using constructor parameters encoded
        bytes memory bytecode = abi.encodePacked(
            type(MatchWithDrawMinimal).creationCode,
            abi.encode(
                homeTeam,
                awayTeam,
                matchStartTime,
                oddsHome,
                oddsAway,
                oddsDraw,
                msg.sender,
                nativeStaking,
                tokenStaking
            )
        );
        
        address matchAddress;
        assembly {
            matchAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(matchAddress != address(0), "Deploy failed");
        
        allMatchesWithDraw.push(matchAddress);
        isMatchActive[matchAddress] = true;
        matchLeague[matchAddress] = league;
        
        emit MatchWithDrawCreated(matchAddress, homeTeam, awayTeam, matchStartTime, block.timestamp);
        
        return matchAddress;
    }
    
    /**
     * @dev Create match without draw option
     */
    function createMatchNoDraw(
        string memory league,
        string memory teamA,
        string memory teamB,
        uint256 matchStartTime,
        uint256 oddsA,
        uint256 oddsB
    ) external onlyOwner returns (address) {
        require(matchStartTime > block.timestamp - 7 days, "Match time too far in the past");
        require(oddsA >= 100 && oddsB >= 100, "Odds must be >= 1.0x");
        
        bytes memory bytecode = abi.encodePacked(
            type(MatchNoDrawMinimal).creationCode,
            abi.encode(
                teamA,
                teamB,
                matchStartTime,
                oddsA,
                oddsB,
                msg.sender,
                nativeStaking,
                tokenStaking
            )
        );
        
        address matchAddress;
        assembly {
            matchAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(matchAddress != address(0), "Deploy failed");
        
        allMatchesNoDraw.push(matchAddress);
        isMatchActive[matchAddress] = true;
        matchLeague[matchAddress] = league;
        
        emit MatchNoDrawCreated(matchAddress, teamA, teamB, matchStartTime, block.timestamp);
        
        return matchAddress;
    }
    
    // View functions
    function getAllMatchesWithDraw() external view returns (address[] memory) {
        return allMatchesWithDraw;
    }
    
    function getAllMatchesNoDraw() external view returns (address[] memory) {
        return allMatchesNoDraw;
    }
    
    function getTotalMatchesWithDraw() external view returns (uint256) {
        return allMatchesWithDraw.length;
    }
    
    function getTotalMatchesNoDraw() external view returns (uint256) {
        return allMatchesNoDraw.length;
    }
    
    function setMatchActive(address matchAddress, bool active) external onlyOwner {
        require(matchAddress != address(0), "Invalid address");
        isMatchActive[matchAddress] = active;
        emit MatchStatusChanged(matchAddress, active);
    }
    
    function getActiveMatchesWithDraw() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allMatchesWithDraw.length; i++) {
            if (isMatchActive[allMatchesWithDraw[i]]) {
                try IMatch(allMatchesWithDraw[i]).finalized() returns (bool finalized) {
                    if (!finalized) activeCount++;
                } catch {}
            }
        }
        
        address[] memory activeMatches = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allMatchesWithDraw.length; i++) {
            if (isMatchActive[allMatchesWithDraw[i]]) {
                try IMatch(allMatchesWithDraw[i]).finalized() returns (bool finalized) {
                    if (!finalized) {
                        activeMatches[index] = allMatchesWithDraw[i];
                        index++;
                    }
                } catch {}
            }
        }
        return activeMatches;
    }
    
    function getActiveMatchesNoDraw() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allMatchesNoDraw.length; i++) {
            if (isMatchActive[allMatchesNoDraw[i]]) {
                try IMatch(allMatchesNoDraw[i]).finalized() returns (bool finalized) {
                    if (!finalized) activeCount++;
                } catch {}
            }
        }
        
        address[] memory activeMatches = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allMatchesNoDraw.length; i++) {
            if (isMatchActive[allMatchesNoDraw[i]]) {
                try IMatch(allMatchesNoDraw[i]).finalized() returns (bool finalized) {
                    if (!finalized) {
                        activeMatches[index] = allMatchesNoDraw[i];
                        index++;
                    }
                } catch {}
            }
        }
        return activeMatches;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

// Minimal Match contracts embedded in Factory for deployment
// These are simplified versions to reduce bytecode size

contract MatchWithDrawMinimal {
    address public owner;
    string public homeTeam;
    string public awayTeam;
    uint256 public matchStartTime;
    uint256 public bettingDeadline;
    string public homeTeamImage;
    string public awayTeamImage;
    uint256 public oddsHome;
    uint256 public oddsAway;
    uint256 public oddsDraw;
    uint256 public maxBetAmount = 10 ether;
    uint256 public totalBetsHome;
    uint256 public totalBetsAway;
    uint256 public totalBetsDraw;
    uint256 public ownerLiquidity;
    uint256 public totalOwnerDeposit;
    address public nativeStaking;
    address public tokenStaking;
    uint256 public nativeStakingShare = 1500;
    uint256 public tokenStakingShare = 1000;
    uint256 public constant MIN_BONUS_THRESHOLD = 0.0001 ether;
    uint8 public result = 0;
    bool public finalized = false;
    mapping(address => mapping(uint8 => uint256)) public userBets;
    mapping(address => bool) public hasClaimed;
    
    event LiquidityDeposited(address indexed owner, uint256 amount);
    event BetPlaced(address indexed user, uint8 choice, uint256 amount);
    event ResultFinalized(uint8 result);
    event WinningsClaimed(address indexed user, uint256 amount);
    event ProfitWithdrawn(address indexed owner, uint256 amount, uint256 profit, uint256 bonusNative, uint256 bonusToken);
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    
    constructor(string memory _homeTeam, string memory _awayTeam, uint256 _matchStartTime, uint256 _oddsHome, uint256 _oddsAway, uint256 _oddsDraw, address _owner, address _nativeStaking, address _tokenStaking) {
        homeTeam = _homeTeam; awayTeam = _awayTeam; matchStartTime = _matchStartTime;
        oddsHome = _oddsHome; oddsAway = _oddsAway; oddsDraw = _oddsDraw;
        owner = _owner; nativeStaking = _nativeStaking; tokenStaking = _tokenStaking;
        bettingDeadline = _matchStartTime - 10 minutes;
    }
    
    function setTeamImages(string memory _home, string memory _away) external onlyOwner { homeTeamImage = _home; awayTeamImage = _away; }
    function setMaxBetAmount(uint256 _max) external onlyOwner { maxBetAmount = _max; }
    function setStakingAddresses(address _native, address _token) external onlyOwner { nativeStaking = _native; tokenStaking = _token; }
    
    function depositLiquidity() external payable onlyOwner {
        require(block.timestamp < bettingDeadline, "Betting ended");
        ownerLiquidity += msg.value; totalOwnerDeposit += msg.value;
        emit LiquidityDeposited(msg.sender, msg.value);
    }
    
    function bet(uint8 choice) external payable {
        require(block.timestamp < bettingDeadline && !finalized, "Betting closed");
        require(choice >= 1 && choice <= 3 && msg.value > 0 && msg.value <= maxBetAmount, "Invalid bet");
        uint256 odds = choice == 1 ? oddsHome : choice == 2 ? oddsAway : oddsDraw;
        require((msg.value * odds) / 100 <= ownerLiquidity + totalBetsHome + totalBetsAway + totalBetsDraw, "Insufficient liquidity");
        userBets[msg.sender][choice] += msg.value;
        if (choice == 1) totalBetsHome += msg.value;
        else if (choice == 2) totalBetsAway += msg.value;
        else totalBetsDraw += msg.value;
        emit BetPlaced(msg.sender, choice, msg.value);
    }
    
    function finalizeResult(uint8 _result) external onlyOwner {
        require(block.timestamp >= matchStartTime && !finalized && _result >= 1 && _result <= 4, "Invalid");
        result = _result; finalized = true;
        emit ResultFinalized(_result);
    }
    
    function claim() external {
        require(finalized && !hasClaimed[msg.sender], "Cannot claim");
        uint256 winAmount = 0;
        if (result == 4) { winAmount = userBets[msg.sender][1] + userBets[msg.sender][2] + userBets[msg.sender][3]; }
        else { uint256 betAmt = userBets[msg.sender][result]; if (betAmt > 0) { uint256 odds = result == 1 ? oddsHome : result == 2 ? oddsAway : oddsDraw; winAmount = (betAmt * odds) / 100; } }
        require(winAmount > 0, "No winnings");
        hasClaimed[msg.sender] = true;
        payable(msg.sender).transfer(winAmount);
        emit WinningsClaimed(msg.sender, winAmount);
    }
    
    function withdrawProfit() external onlyOwner {
        require(finalized, "Not finalized");
        uint256 totalCollected = totalBetsHome + totalBetsAway + totalBetsDraw;
        uint256 totalPaidOut = result == 1 ? (totalBetsHome * oddsHome) / 100 : result == 2 ? (totalBetsAway * oddsAway) / 100 : result == 3 ? (totalBetsDraw * oddsDraw) / 100 : totalCollected;
        uint256 withdrawable; uint256 profit = 0;
        if (totalPaidOut >= totalCollected) { withdrawable = ownerLiquidity + totalCollected >= totalPaidOut ? ownerLiquidity + totalCollected - totalPaidOut : 0; }
        else { profit = totalCollected - totalPaidOut; withdrawable = ownerLiquidity + profit; }
        require(withdrawable > 0, "Nothing to withdraw");
        uint256 bonusNative = 0; uint256 bonusToken = 0;
        if (profit > 0) {
            bonusNative = (profit * nativeStakingShare) / 10000;
            bonusToken = (profit * tokenStakingShare) / 10000;
            if (bonusNative >= MIN_BONUS_THRESHOLD && nativeStaking != address(0)) { (bool s,) = nativeStaking.call{value: bonusNative}(abi.encodeWithSignature("receiveRevenue()")); if (!s) bonusNative = 0; }
            else bonusNative = 0;
            if (bonusToken >= MIN_BONUS_THRESHOLD && tokenStaking != address(0)) { (bool s,) = tokenStaking.call{value: bonusToken}(abi.encodeWithSignature("receiveRevenue()")); if (!s) bonusToken = 0; }
            else bonusToken = 0;
        }
        ownerLiquidity = 0; totalOwnerDeposit = 0;
        payable(owner).transfer(withdrawable - bonusNative - bonusToken);
        emit ProfitWithdrawn(owner, withdrawable - bonusNative - bonusToken, profit, bonusNative, bonusToken);
    }
    
    function getMatchInfo() external view returns (string memory, string memory, uint256, uint256, uint256, uint256, uint256, uint8, bool) { return (homeTeam, awayTeam, matchStartTime, bettingDeadline, oddsHome, oddsAway, oddsDraw, result, finalized); }
    function getTeamImages() external view returns (string memory, string memory) { return (homeTeamImage, awayTeamImage); }
    function getMaxBetAmount() external view returns (uint256) { return maxBetAmount; }
    function getBettingPools() external view returns (uint256, uint256, uint256, uint256) { return (totalBetsHome, totalBetsAway, totalBetsDraw, ownerLiquidity); }
    function getUserBets(address user) external view returns (uint256, uint256, uint256, bool) { return (userBets[user][1], userBets[user][2], userBets[user][3], hasClaimed[user]); }
    function getStakingAddresses() external view returns (address, address) { return (nativeStaking, tokenStaking); }
    function getRevenueShareInfo() external view returns (uint256, uint256, uint256) { return (nativeStakingShare, tokenStakingShare, totalOwnerDeposit); }
    function isBettingOpen() external view returns (bool) { return block.timestamp < bettingDeadline && !finalized; }
    function getTimeLeft() external view returns (uint256) { return block.timestamp >= bettingDeadline ? 0 : bettingDeadline - block.timestamp; }
}

contract MatchNoDrawMinimal {
    address public owner;
    string public teamA;
    string public teamB;
    uint256 public matchStartTime;
    uint256 public bettingDeadline;
    string public teamAImage;
    string public teamBImage;
    uint256 public oddsA;
    uint256 public oddsB;
    uint256 public maxBetAmount = 10 ether;
    uint256 public totalBetsA;
    uint256 public totalBetsB;
    uint256 public ownerLiquidity;
    uint256 public totalOwnerDeposit;
    address public nativeStaking;
    address public tokenStaking;
    uint256 public nativeStakingShare = 1500;
    uint256 public tokenStakingShare = 1000;
    uint256 public constant MIN_BONUS_THRESHOLD = 0.0001 ether;
    uint8 public result = 0;
    bool public finalized = false;
    mapping(address => mapping(uint8 => uint256)) public userBets;
    mapping(address => bool) public hasClaimed;
    
    event LiquidityDeposited(address indexed owner, uint256 amount);
    event BetPlaced(address indexed user, uint8 choice, uint256 amount);
    event ResultFinalized(uint8 result);
    event WinningsClaimed(address indexed user, uint256 amount);
    event ProfitWithdrawn(address indexed owner, uint256 amount, uint256 profit, uint256 bonusNative, uint256 bonusToken);
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    
    constructor(string memory _teamA, string memory _teamB, uint256 _matchStartTime, uint256 _oddsA, uint256 _oddsB, address _owner, address _nativeStaking, address _tokenStaking) {
        teamA = _teamA; teamB = _teamB; matchStartTime = _matchStartTime;
        oddsA = _oddsA; oddsB = _oddsB;
        owner = _owner; nativeStaking = _nativeStaking; tokenStaking = _tokenStaking;
        bettingDeadline = _matchStartTime - 10 minutes;
    }
    
    function setTeamImages(string memory _a, string memory _b) external onlyOwner { teamAImage = _a; teamBImage = _b; }
    function setMaxBetAmount(uint256 _max) external onlyOwner { maxBetAmount = _max; }
    function setStakingAddresses(address _native, address _token) external onlyOwner { nativeStaking = _native; tokenStaking = _token; }
    
    function depositLiquidity() external payable onlyOwner {
        require(block.timestamp < bettingDeadline, "Betting ended");
        ownerLiquidity += msg.value; totalOwnerDeposit += msg.value;
        emit LiquidityDeposited(msg.sender, msg.value);
    }
    
    function bet(uint8 choice) external payable {
        require(block.timestamp < bettingDeadline && !finalized, "Betting closed");
        require(choice >= 1 && choice <= 2 && msg.value > 0 && msg.value <= maxBetAmount, "Invalid bet");
        uint256 odds = choice == 1 ? oddsA : oddsB;
        require((msg.value * odds) / 100 <= ownerLiquidity + totalBetsA + totalBetsB, "Insufficient liquidity");
        userBets[msg.sender][choice] += msg.value;
        if (choice == 1) totalBetsA += msg.value; else totalBetsB += msg.value;
        emit BetPlaced(msg.sender, choice, msg.value);
    }
    
    function finalizeResult(uint8 _result) external onlyOwner {
        require(block.timestamp >= matchStartTime && !finalized && _result >= 1 && _result <= 3, "Invalid");
        result = _result; finalized = true;
        emit ResultFinalized(_result);
    }
    
    function claim() external {
        require(finalized && !hasClaimed[msg.sender], "Cannot claim");
        uint256 winAmount = 0;
        if (result == 3) { winAmount = userBets[msg.sender][1] + userBets[msg.sender][2]; }
        else { uint256 betAmt = userBets[msg.sender][result]; if (betAmt > 0) { uint256 odds = result == 1 ? oddsA : oddsB; winAmount = (betAmt * odds) / 100; } }
        require(winAmount > 0, "No winnings");
        hasClaimed[msg.sender] = true;
        payable(msg.sender).transfer(winAmount);
        emit WinningsClaimed(msg.sender, winAmount);
    }
    
    function withdrawProfit() external onlyOwner {
        require(finalized, "Not finalized");
        uint256 totalCollected = totalBetsA + totalBetsB;
        uint256 totalPaidOut = result == 1 ? (totalBetsA * oddsA) / 100 : result == 2 ? (totalBetsB * oddsB) / 100 : totalCollected;
        uint256 withdrawable; uint256 profit = 0;
        if (totalPaidOut >= totalCollected) { withdrawable = ownerLiquidity + totalCollected >= totalPaidOut ? ownerLiquidity + totalCollected - totalPaidOut : 0; }
        else { profit = totalCollected - totalPaidOut; withdrawable = ownerLiquidity + profit; }
        require(withdrawable > 0, "Nothing to withdraw");
        uint256 bonusNative = 0; uint256 bonusToken = 0;
        if (profit > 0) {
            bonusNative = (profit * nativeStakingShare) / 10000;
            bonusToken = (profit * tokenStakingShare) / 10000;
            if (bonusNative >= MIN_BONUS_THRESHOLD && nativeStaking != address(0)) { (bool s,) = nativeStaking.call{value: bonusNative}(abi.encodeWithSignature("receiveRevenue()")); if (!s) bonusNative = 0; }
            else bonusNative = 0;
            if (bonusToken >= MIN_BONUS_THRESHOLD && tokenStaking != address(0)) { (bool s,) = tokenStaking.call{value: bonusToken}(abi.encodeWithSignature("receiveRevenue()")); if (!s) bonusToken = 0; }
            else bonusToken = 0;
        }
        ownerLiquidity = 0; totalOwnerDeposit = 0;
        payable(owner).transfer(withdrawable - bonusNative - bonusToken);
        emit ProfitWithdrawn(owner, withdrawable - bonusNative - bonusToken, profit, bonusNative, bonusToken);
    }
    
    function getMatchInfo() external view returns (string memory, string memory, uint256, uint256, uint256, uint256, uint8, bool) { return (teamA, teamB, matchStartTime, bettingDeadline, oddsA, oddsB, result, finalized); }
    function getTeamImages() external view returns (string memory, string memory) { return (teamAImage, teamBImage); }
    function getMaxBetAmount() external view returns (uint256) { return maxBetAmount; }
    function getBettingPools() external view returns (uint256, uint256, uint256) { return (totalBetsA, totalBetsB, ownerLiquidity); }
    function getUserBets(address user) external view returns (uint256, uint256, bool) { return (userBets[user][1], userBets[user][2], hasClaimed[user]); }
    function getStakingAddresses() external view returns (address, address) { return (nativeStaking, tokenStaking); }
    function getRevenueShareInfo() external view returns (uint256, uint256, uint256) { return (nativeStakingShare, tokenStakingShare, totalOwnerDeposit); }
    function isBettingOpen() external view returns (bool) { return block.timestamp < bettingDeadline && !finalized; }
    function getTimeLeft() external view returns (uint256) { return block.timestamp >= bettingDeadline ? 0 : bettingDeadline - block.timestamp; }
}
