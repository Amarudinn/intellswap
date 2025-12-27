// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MasterFactory
 * @dev Registry untuk mengelola multiple SportsBettingFactory
 * 
 * CARA PENGGUNAAN:
 * 1. Deploy MasterFactory sekali
 * 2. Deploy SportsBettingFactory secara terpisah (dari Remix/Hardhat)
 * 3. Register factory ke MasterFactory via addFactory()
 * 4. Admin panel akan membaca factories dari MasterFactory
 */

interface ISportsBettingFactory {
    function transferOwnership(address newOwner) external;
    function getTotalMatchesWithDraw() external view returns (uint256);
    function getTotalMatchesNoDraw() external view returns (uint256);
    function setStakingAddresses(address _nativeStaking, address _tokenStaking) external;
    function owner() external view returns (address);
}

contract MasterFactory {
    address public owner;
    
    // Staking addresses (untuk di-set ke factory baru)
    address public defaultNativeStaking;
    address public defaultTokenStaking;
    
    // Array of child factories
    address[] public childFactories;
    
    // Mapping for quick lookup
    mapping(address => bool) public isFactory;
    mapping(address => string) public factoryName;
    mapping(address => bool) public factoryActive;
    
    event FactoryAdded(address indexed factoryAddress, string name, uint256 timestamp);
    event FactoryStatusChanged(address indexed factoryAddress, bool active);
    event DefaultStakingUpdated(address nativeStaking, address tokenStaking);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set default staking addresses untuk factory baru
     */
    function setDefaultStakingAddresses(address _nativeStaking, address _tokenStaking) external onlyOwner {
        defaultNativeStaking = _nativeStaking;
        defaultTokenStaking = _tokenStaking;
        emit DefaultStakingUpdated(_nativeStaking, _tokenStaking);
    }
    
    /**
     * @dev Add existing factory yang sudah di-deploy
     * @param factoryAddress Address dari SportsBettingFactory yang sudah di-deploy
     * @param name Nama untuk factory ini
     */
    function addFactory(address factoryAddress, string memory name) external onlyOwner returns (address) {
        require(factoryAddress != address(0), "Invalid address");
        require(!isFactory[factoryAddress], "Factory already added");
        
        // Store factory info
        childFactories.push(factoryAddress);
        isFactory[factoryAddress] = true;
        factoryName[factoryAddress] = name;
        factoryActive[factoryAddress] = true;
        
        emit FactoryAdded(factoryAddress, name, block.timestamp);
        
        return factoryAddress;
    }
    
    /**
     * @dev Add factory dan set staking addresses sekaligus
     */
    function addFactoryWithStaking(address factoryAddress, string memory name) external onlyOwner returns (address) {
        require(factoryAddress != address(0), "Invalid address");
        require(!isFactory[factoryAddress], "Factory already added");
        
        // Set staking addresses di factory
        if (defaultNativeStaking != address(0) || defaultTokenStaking != address(0)) {
            try ISportsBettingFactory(factoryAddress).setStakingAddresses(defaultNativeStaking, defaultTokenStaking) {} catch {}
        }
        
        // Store factory info
        childFactories.push(factoryAddress);
        isFactory[factoryAddress] = true;
        factoryName[factoryAddress] = name;
        factoryActive[factoryAddress] = true;
        
        emit FactoryAdded(factoryAddress, name, block.timestamp);
        
        return factoryAddress;
    }
    
    /**
     * @dev Update staking addresses untuk factory tertentu
     */
    function updateFactoryStaking(address factoryAddress, address _nativeStaking, address _tokenStaking) external onlyOwner {
        require(isFactory[factoryAddress], "Not a factory");
        ISportsBettingFactory(factoryAddress).setStakingAddresses(_nativeStaking, _tokenStaking);
    }
    
    /**
     * @dev Set factory active/inactive
     */
    function setFactoryActive(address factoryAddress, bool active) external onlyOwner {
        require(isFactory[factoryAddress], "Not a factory");
        factoryActive[factoryAddress] = active;
        emit FactoryStatusChanged(factoryAddress, active);
    }
    
    /**
     * @dev Update factory name
     */
    function setFactoryName(address factoryAddress, string memory name) external onlyOwner {
        require(isFactory[factoryAddress], "Not a factory");
        factoryName[factoryAddress] = name;
    }
    
    /**
     * @dev Remove factory from registry (doesn't delete the actual contract)
     */
    function removeFactory(address factoryAddress) external onlyOwner {
        require(isFactory[factoryAddress], "Not a factory");
        
        isFactory[factoryAddress] = false;
        factoryActive[factoryAddress] = false;
        
        // Remove from array
        for (uint256 i = 0; i < childFactories.length; i++) {
            if (childFactories[i] == factoryAddress) {
                childFactories[i] = childFactories[childFactories.length - 1];
                childFactories.pop();
                break;
            }
        }
    }
    
    // View functions
    function getAllFactories() external view returns (address[] memory) {
        return childFactories;
    }
    
    function getActiveFactories() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < childFactories.length; i++) {
            if (factoryActive[childFactories[i]]) {
                activeCount++;
            }
        }
        
        address[] memory result = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < childFactories.length; i++) {
            if (factoryActive[childFactories[i]]) {
                result[index] = childFactories[i];
                index++;
            }
        }
        return result;
    }
    
    function getFactoryInfo(address factoryAddress) external view returns (
        string memory name,
        bool active,
        uint256 totalMatchesWithDraw,
        uint256 totalMatchesNoDraw
    ) {
        require(isFactory[factoryAddress], "Not a factory");
        
        ISportsBettingFactory factory = ISportsBettingFactory(factoryAddress);
        
        return (
            factoryName[factoryAddress],
            factoryActive[factoryAddress],
            factory.getTotalMatchesWithDraw(),
            factory.getTotalMatchesNoDraw()
        );
    }
    
    function getTotalFactories() external view returns (uint256) {
        return childFactories.length;
    }
    
    function getDefaultStakingAddresses() external view returns (address, address) {
        return (defaultNativeStaking, defaultTokenStaking);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
