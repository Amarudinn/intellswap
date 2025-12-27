import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Web3Provider, useWeb3 } from '../context/Web3Context';
import { FactoryProvider, useFactory } from '../context/FactoryContext';
import { config, rainbowTheme } from '../config/wagmi';
import Navbar from '../components/Navbar';
import GridScan from '../components/GridScan';
import MatchCard from '../components/MatchCard';
import RewardsModal from '../components/RewardsModal';
import UserHistoryModal from '../components/UserHistoryModal';
import MyBetsModal from '../components/MyBetsModal';
import Swal from 'sweetalert2';

import { factoryAbi, sportsBettingAddresses, matchWithDrawAbi, matchNoDrawAbi } from '../config/sportsBettingAbi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const PredictionContent = () => {
  const { account } = useWeb3();
  const { address: wagmiAddress, isConnected } = useAccount(); // Add wagmi hook for better detection
  const { currentFactory, factories, switchFactory } = useFactory();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [factoryContract, setFactoryContract] = useState(null);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMyBetsOpen, setIsMyBetsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [ethereumAddress, setEthereumAddress] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const NEXUS_CHAIN_ID = 5003; // Mantle Testnet chain ID

  // Direct ethereum detection for dApp browsers
  useEffect(() => {
    const detectEthereumAddress = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            console.log('🔍 Direct ethereum detection:', accounts[0]);
            setEthereumAddress(accounts[0]);
          }

          // Check current chain
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdDecimal = parseInt(chainId, 16);
          console.log('🌐 Current chain ID:', chainIdDecimal);
          setCurrentChainId(chainIdDecimal);
          setIsWrongNetwork(chainIdDecimal !== NEXUS_CHAIN_ID);
        } catch (error) {
          console.error('Error detecting ethereum address:', error);
        }
      }
    };

    detectEthereumAddress();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          console.log('🔄 Ethereum accounts changed:', accounts[0]);
          setEthereumAddress(accounts[0]);
        } else {
          setEthereumAddress(null);
        }
      };

      const handleChainChanged = (chainId) => {
        const chainIdDecimal = parseInt(chainId, 16);
        console.log('🔄 Chain changed:', chainIdDecimal);
        setCurrentChainId(chainIdDecimal);
        setIsWrongNetwork(chainIdDecimal !== NEXUS_CHAIN_ID);
        // Reload page on chain change for safety
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Use multiple sources for address detection (priority order)
  const connectedAddress = account || wagmiAddress || ethereumAddress;

  // Debug logging for mobile/dApp browsers
  useEffect(() => {
    console.log('🔍 Wallet Detection Debug:');
    console.log('   - account (Web3Context):', account);
    console.log('   - wagmiAddress:', wagmiAddress);
    console.log('   - ethereumAddress (direct):', ethereumAddress);
    console.log('   - isConnected:', isConnected);
    console.log('   - connectedAddress (final):', connectedAddress);
    console.log('   - currentChainId:', currentChainId);
    console.log('   - isWrongNetwork:', isWrongNetwork);
    console.log('   - window.ethereum:', !!window.ethereum);
    console.log('   - window.ethereum.selectedAddress:', window.ethereum?.selectedAddress);
  }, [account, wagmiAddress, ethereumAddress, isConnected, connectedAddress, currentChainId, isWrongNetwork]);

  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  useEffect(() => {
    console.log('🏭 PredictionPage: currentFactory changed:', currentFactory);
    if (window.ethereum && currentFactory) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        currentFactory,
        factoryAbi,
        provider
      );
      setFactoryContract(contract);
      console.log('✅ Factory contract set:', currentFactory);
    }
  }, [currentFactory]);

  useEffect(() => {
    if (selectedFilter === 'all' || factoryContract) {
      // Only fetch if wallet is connected
      if (!connectedAddress) {
        console.log('⏸️ Wallet not connected, skipping fetch');
        setMatches([]);
        setLoading(false);
        return;
      }
      fetchActiveMatches();
    }
  }, [factoryContract, selectedFilter, connectedAddress]);

  const handleSwitchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x138B' }], // 5003 in hex
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x138B',
                chainName: 'Mantle Testnet',
                nativeCurrency: {
                  name: 'Mantle Testnet',
                  symbol: 'MNT',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
                blockExplorerUrls: ['https://sepolia.mantlescan.xyz'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          Swal.fire({
            icon: 'error',
            title: 'Failed to Add Network',
            text: 'Failed to add Mantle Testnet network. Please add it manually in your wallet settings.',
            background: '#1a1a1a',
            color: '#fff',
            confirmButtonColor: '#69d169',
          });
        }
      } else {
        console.error('Error switching network:', switchError);
        Swal.fire({
          icon: 'error',
          title: 'Failed to Switch Network',
          text: 'Failed to switch network. Please switch manually in your wallet.',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      }
    }
  };

  const fetchActiveMatches = async () => {
    setLoading(true);
    try {
      let allMatches = [];

      if (selectedFilter === 'all') {
        // Fetch from all factories
        console.log('📊 Fetching matches from all factories');
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        for (const factory of factories) {
          try {
            const contract = new ethers.Contract(factory.address, factoryAbi, provider);
            const activeWithDraw = await contract.getActiveMatchesWithDraw();
            const activeNoDraw = await contract.getActiveMatchesNoDraw();
            
            console.log(`   - Factory ${factory.name}: ${activeWithDraw.length} withDraw, ${activeNoDraw.length} noDraw`);
            
            allMatches.push(
              ...activeWithDraw.map(addr => ({ 
                address: addr, 
                type: 'withDraw', 
                factoryAddress: factory.address 
              })),
              ...activeNoDraw.map(addr => ({ 
                address: addr, 
                type: 'noDraw', 
                factoryAddress: factory.address 
              }))
            );
          } catch (err) {
            console.error(`❌ Error fetching from factory ${factory.address}:`, err.message || err);
            // Continue to next factory instead of breaking
          }
        }
      } else {
        // Fetch from current factory only
        if (!factoryContract) {
          console.log('⚠️ No factory contract available');
          setMatches([]);
          setLoading(false);
          return;
        }
        
        console.log('📊 Fetching matches from current factory');
        
        try {
          const activeWithDraw = await factoryContract.getActiveMatchesWithDraw();
          const activeNoDraw = await factoryContract.getActiveMatchesNoDraw();

          allMatches = [
            ...activeWithDraw.map(addr => ({ address: addr, type: 'withDraw' })),
            ...activeNoDraw.map(addr => ({ address: addr, type: 'noDraw' }))
          ];
        } catch (err) {
          console.error('❌ Error fetching from current factory:', err.message || err);
          allMatches = [];
        }
      }

      // Contract already filters finalized matches
      console.log(`✅ Active matches: ${allMatches.length}`);
      setMatches(allMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen pt-20 pb-24 md:pb-8 px-3 sm:px-4 ${(!connectedAddress || isWrongNetwork) && !loading ? 'flex items-center justify-center' : ''}`}>
        <div className="container mx-auto max-w-7xl w-full">

          {loading ? (
            <div className="text-center py-20">
              <i className="fa-solid fa-spinner fa-spin text-4xl text-[#69d169] mb-4"></i>
              <p className="text-gray-400">Loading matches...</p>
            </div>
          ) : !connectedAddress ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-[#69d169]/30">
                <i className="fa-solid fa-wallet text-5xl text-[#69d169]"></i>
              </div>
              <h2 className="text-2xl font-bold text-[#69d169] mb-3">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-2 max-w-md mx-auto">
                Please connect your wallet to view and place bets on upcoming matches
              </p>
            </div>
          ) : isWrongNetwork ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-orange-500/30">
                <i className="fa-solid fa-network-wired text-5xl text-orange-400"></i>
              </div>
              <h2 className="text-2xl font-bold text-orange-400 mb-3">Wrong Network</h2>
              <p className="text-gray-400 mb-2 max-w-md mx-auto">
                You're connected to the wrong network. Please switch to Mantle Testnet.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Current Chain ID: {currentChainId} | Required: {NEXUS_CHAIN_ID}
              </p>
              <button
                onClick={handleSwitchNetwork}
                className="px-6 py-3 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-black font-bold rounded-xl transition-all text-sm shadow-lg hover:shadow-xl"
              >
                <i className="fa-solid fa-repeat mr-2"></i>
                Switch to Mantle Testnet Network
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP LAYOUT - Hidden on mobile */}
              <div className="hidden md:block mb-6">
                <div className="flex items-center justify-between">
                  {/* Left side: Title + Filter */}
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-white">
                      {matches.length > 0 ? `Active Matches (${matches.length})` : 'Active Matches'}
                    </h2>
                    
                    {/* Factory Filter - Custom Dropdown */}
                    {factories.length > 1 && (
                      <div className="relative z-10">
                        {/* Dropdown Button */}
                        <button
                          onClick={() => setIsDesktopDropdownOpen(!isDesktopDropdownOpen)}
                          className="flex items-center space-x-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 rounded-xl border border-[#69d169]/20 hover:border-[#69d169]/40 focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all duration-200"
                        >
                          <i className="fa-solid fa-filter text-[#69d169] text-xs"></i>
                          <span className="text-white font-semibold text-sm">
                            {selectedFilter === 'all' 
                              ? 'All Factories' 
                              : factories.find(f => f.address === selectedFilter)?.name || 'Select Factory'
                            }
                          </span>
                          <i className={`fa-solid fa-chevron-down text-[#69d169] text-xs transition-transform ${isDesktopDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* Custom Dropdown Menu */}
                        {isDesktopDropdownOpen && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div 
                              className="fixed inset-0 z-[150]" 
                              onClick={() => setIsDesktopDropdownOpen(false)}
                            />
                            
                            {/* Dropdown List */}
                            <div className="absolute top-full left-0 mt-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border-2 border-[#69d169]/30 shadow-2xl overflow-hidden z-[151] animate-fade-in min-w-[200px]">
                              <div className="max-h-[400px] overflow-y-auto">
                                {/* All Factories Option */}
                                <button
                                  onClick={() => {
                                    setSelectedFilter('all');
                                    setIsDesktopDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 transition-all border-b border-[#69d169]/10 ${
                                    selectedFilter === 'all'
                                      ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                                      : 'hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`font-semibold text-sm ${selectedFilter === 'all' ? 'text-white' : 'text-gray-400'}`}>
                                      🌐 All Factories
                                    </span>
                                    {selectedFilter === 'all' && <i className="fa-solid fa-check text-[#69d169] text-xs"></i>}
                                  </div>
                                </button>

                                {/* Factory Options */}
                                {factories.map((factory, index) => {
                                  const isSelected = selectedFilter === factory.address;
                                  
                                  return (
                                    <button
                                      key={factory.address}
                                      onClick={() => {
                                        setSelectedFilter(factory.address);
                                        switchFactory(factory.address);
                                        setIsDesktopDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 transition-all ${
                                        index < factories.length - 1 ? 'border-b border-[#69d169]/10' : ''
                                      } ${
                                        isSelected
                                          ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                                          : 'hover:bg-white/5'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <i className={`fa-solid ${factory.active ? 'fa-trophy' : 'fa-folder'} text-[#69d169] text-sm`}></i>
                                          <span className={`font-semibold text-sm ${isSelected ? 'text-white' : factory.active ? 'text-white' : 'text-gray-400'}`}>
                                            {factory.name}
                                          </span>
                                        </div>
                                        {isSelected && <i className="fa-solid fa-check text-[#69d169] text-xs"></i>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side: Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMyBetsOpen(true)}
                      className="px-4 py-2 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold"
                    >
                      <i className="fa-solid fa-list mr-2"></i>
                      My Bets
                    </button>
                    <button
                      onClick={() => {
                        console.log('🖱️ History button clicked');
                        console.log('   - Current account:', account);
                        setIsHistoryOpen(true);
                      }}
                      className="px-4 py-2 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold"
                    >
                      <i className="fa-solid fa-clock-rotate-left mr-2"></i>
                      History
                    </button>
                    <button
                      onClick={() => setIsRewardsOpen(true)}
                      className="px-4 py-2 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold"
                    >
                      <i className="fa-solid fa-trophy mr-2"></i>
                      Rewards
                    </button>
                    <button
                      onClick={fetchActiveMatches}
                      className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
                      title="Refresh matches"
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* MOBILE LAYOUT - Hidden on desktop */}
              <div className="md:hidden mb-6 space-y-3">
                {/* Title */}
                <h2 className="text-lg font-semibold text-white">
                  {matches.length > 0 ? `Active Matches (${matches.length})` : 'Active Matches'}
                </h2>

                {/* Factory Filter - Custom Dropdown (same as desktop) */}
                {factories.length > 1 && (
                  <div className="relative z-10">
                    {/* Dropdown Button */}
                    <button
                      onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-br from-black/60 to-black/40 text-white rounded-xl border border-[#69d169]/20 hover:border-[#69d169]/40 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <i className="fa-solid fa-filter text-[#69d169]"></i>
                        <span className="font-medium">
                          {selectedFilter === 'all' 
                            ? 'All Factories' 
                            : factories.find(f => f.address === selectedFilter)?.name || 'Select Factory'
                          }
                        </span>
                      </div>
                      <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform ${isMobileDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {/* Custom Dropdown Menu */}
                    {isMobileDropdownOpen && (
                      <>
                        {/* Backdrop to close dropdown */}
                        <div 
                          className="fixed inset-0 z-[150]" 
                          onClick={() => setIsMobileDropdownOpen(false)}
                        />
                        
                        {/* Dropdown List */}
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border-2 border-[#69d169]/30 shadow-2xl overflow-hidden z-[151] animate-fade-in">
                          <div className="max-h-[400px] overflow-y-auto">
                            {/* All Factories Option */}
                            <button
                              onClick={() => {
                                setSelectedFilter('all');
                                setIsMobileDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 transition-all border-b border-[#69d169]/10 ${
                                selectedFilter === 'all'
                                  ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm ${selectedFilter === 'all' ? 'text-white' : 'text-gray-400'}`}>
                                  🌐 All Factories
                                </span>
                                {selectedFilter === 'all' && <i className="fa-solid fa-check text-[#69d169] text-xs"></i>}
                              </div>
                            </button>

                            {/* Factory Options */}
                            {factories.map((factory, index) => {
                              const isSelected = selectedFilter === factory.address;
                              
                              return (
                                <button
                                  key={factory.address}
                                  onClick={() => {
                                    setSelectedFilter(factory.address);
                                    switchFactory(factory.address);
                                    setIsMobileDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 transition-all ${
                                    index < factories.length - 1 ? 'border-b border-[#69d169]/10' : ''
                                  } ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                                      : 'hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <i className={`fa-solid ${factory.active ? 'fa-trophy' : 'fa-folder'} text-[#69d169] text-sm`}></i>
                                      <span className={`font-semibold text-sm ${isSelected ? 'text-white' : factory.active ? 'text-white' : 'text-gray-400'}`}>
                                        {factory.name}
                                      </span>
                                    </div>
                                    {isSelected && <i className="fa-solid fa-check text-[#69d169] text-xs"></i>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Action Buttons - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsMyBetsOpen(true)}
                    className="px-3 py-2.5 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center"
                  >
                    <i className="fa-solid fa-list mr-2"></i>
                    My Bets
                  </button>
                  <button
                    onClick={() => {
                      console.log('🖱️ History button clicked');
                      console.log('   - Current account:', account);
                      setIsHistoryOpen(true);
                    }}
                    className="px-3 py-2.5 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center"
                  >
                    <i className="fa-solid fa-clock-rotate-left mr-2"></i>
                    History
                  </button>
                  <button
                    onClick={() => setIsRewardsOpen(true)}
                    className="px-3 py-2.5 bg-black/40 hover:bg-black/60 text-gray-300 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center"
                  >
                    <i className="fa-solid fa-trophy mr-2"></i>
                    Rewards
                  </button>
                  <button
                    onClick={fetchActiveMatches}
                    className="px-3 py-2.5 bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center text-sm font-semibold"
                    title="Refresh matches"
                  >
                    <i className="fa-solid fa-refresh mr-2"></i>
                    Refresh
                  </button>
                </div>
              </div>

              {matches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map((match) => (
                    <MatchCard
                      key={match.address}
                      matchAddress={match.address}
                      matchAbi={match.type === 'withDraw' ? matchWithDrawAbi : matchNoDrawAbi}
                      factoryContract={factoryContract}
                      factoryAddress={match.factoryAddress || currentFactory}
                      factoryAbi={factoryAbi}
                      isAdmin={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="fa-solid fa-futbol text-4xl text-gray-600 mb-3"></i>
                  <p className="text-gray-400 mb-2">No active matches at the moment</p>
                  <p className="text-sm text-gray-500">
                    Check back later for new betting opportunities
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rewards Modal */}
      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        factoryAddress={currentFactory || sportsBettingAddresses.factory}
        factoryAbi={factoryAbi}
        matchWithDrawAbi={matchWithDrawAbi}
        matchNoDrawAbi={matchNoDrawAbi}
        userAddress={connectedAddress}
      />

      {/* History Modal */}
      <UserHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        factoryAddress={currentFactory || sportsBettingAddresses.factory}
        factoryAbi={factoryAbi}
        matchWithDrawAbi={matchWithDrawAbi}
        matchNoDrawAbi={matchNoDrawAbi}
        userAddress={connectedAddress}
      />

      {/* My Bets Modal */}
      <MyBetsModal
        isOpen={isMyBetsOpen}
        onClose={() => setIsMyBetsOpen(false)}
        factoryAddress={currentFactory || sportsBettingAddresses.factory}
        factoryAbi={factoryAbi}
        matchWithDrawAbi={matchWithDrawAbi}
        matchNoDrawAbi={matchNoDrawAbi}
        userAddress={connectedAddress}
        fetchFromAllFactories={selectedFilter === 'all'}
      />


    </>
  );
};

const PredictionPage = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme(rainbowTheme)}>
          <Web3Provider>
            <FactoryProvider>
            <div className="min-h-screen" style={{ position: 'relative' }}>
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
                <GridScan
                  sensitivity={0.55}
                  lineThickness={1}
                  linesColor="#69d169"
                  gridScale={0.08}
                  scanColor="#69d169"
                  scanOpacity={0.6}
                />
              </div>
              
              <PredictionContent />
            </div>
            </FactoryProvider>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default PredictionPage;
