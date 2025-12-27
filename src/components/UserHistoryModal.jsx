import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';
import { useFactory } from '../context/FactoryContext';

// Helper function to convert IPFS URL to HTTP gateway URL
const convertIpfsUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  return url;
};

// Separate component for bet item to handle image error state
const BetItemHistory = ({ bet, match, getChoiceName }) => {
  const [imageError, setImageError] = useState(false);
  const isCancelled = match.result === 4 || (match.result === 3 && !match.hasDraw);
  const isWinner = bet.choice === match.result || isCancelled;
  const payout = isCancelled ? bet.amount : (bet.amount * BigInt(bet.odds || 100)) / 100n;
  
  const rawTeamImage = bet.choice === 1 ? match.team1Image : bet.choice === 2 ? match.team2Image : '';
  const teamImage = convertIpfsUrl(rawTeamImage);

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg ${
        isWinner ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 flex-shrink-0 border border-[#69d169]/30">
          {teamImage && !imageError ? (
            <img 
              src={teamImage} 
              alt={getChoiceName(bet.choice, match)}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <i className="fa-solid fa-shield-halved text-[#69d169] text-sm"></i>
          )}
        </div>
        <div>
          <div className="text-white text-sm font-semibold">
            {getChoiceName(bet.choice, match)}
          </div>
          <div className="text-gray-400 text-xs">
            {(Number(bet.amount) / 1e18).toFixed(4)} MNT
          </div>
        </div>
      </div>
      {isWinner && (
        <div className="text-[#69d169] text-sm font-semibold">
          +{(Number(payout) / 1e18).toFixed(4)} MNT
        </div>
      )}
    </div>
  );
};

const UserHistoryModal = ({ isOpen, onClose, factoryAddress, factoryAbi, matchWithDrawAbi, matchNoDrawAbi, userAddress }) => {
  const { currentFactory, factories } = useFactory();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(''); // Start empty - user must select
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false); // Desktop dropdown
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false); // Mobile dropdown

  // Don't auto-initialize - let user choose
  // This prevents unnecessary contract calls

  // Only fetch when user explicitly selects a factory
  useEffect(() => {
    console.log('🔄 UserHistoryModal useEffect triggered');
    console.log('   - isOpen:', isOpen);
    console.log('   - userAddress:', userAddress);
    console.log('   - selectedFactory:', selectedFactory);
    
    // Only fetch if modal is open AND user has selected a factory
    if (isOpen && selectedFactory) {
      console.log('✅ Factory selected, calling fetchUserHistory...');
      fetchUserHistory();
    } else if (isOpen && !selectedFactory) {
      console.log('⏸️ Waiting for user to select a factory...');
      setHistory([]); // Clear history when no factory selected
    }
  }, [isOpen, userAddress, selectedFactory]);

  const fetchUserHistory = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting fetchUserHistory...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = userAddress || await signer.getAddress();
      
      console.log('👤 User Address:', address);
      
      if (!address) {
        console.error('❌ No wallet connected');
        setHistory([]);
        setLoading(false);
        return;
      }

      const userHistory = [];
      
      // Determine which factories to fetch from
      const factoriesToFetch = (!selectedFactory || selectedFactory === 'all')
        ? factories
        : [factories.find(f => f.address === selectedFactory)].filter(Boolean);

      console.log(`📊 Fetching from ${factoriesToFetch.length} factories`);

      // Fetch from all selected factories
      for (const factory of factoriesToFetch) {
        try {
          const factoryContract = new ethers.Contract(factory.address, factoryAbi, provider);
          const matchesWithDraw = await factoryContract.getAllMatchesWithDraw();
          const matchesNoDraw = await factoryContract.getAllMatchesNoDraw();

          console.log(`📊 Factory ${factory.name}:`, matchesWithDraw.length + matchesNoDraw.length, 'matches');

      // Check WithDraw matches
      for (let addr of matchesWithDraw) {
        try {
          const matchContract = new ethers.Contract(addr, matchWithDrawAbi, provider);
          const info = await matchContract.getMatchInfo();
          const finalized = info[info.length - 1];
          
          console.log(`🔍 WithDraw Match ${addr}:`);
          console.log(`   - Teams: ${info[0]} vs ${info[1]}`);
          console.log(`   - Finalized: ${finalized}`);
          
          if (finalized) {
            const userBetsData = await matchContract.getUserBets(address);
            const betHome = BigInt(userBetsData[0]);
            const betAway = BigInt(userBetsData[1]);
            const betDraw = BigInt(userBetsData[2]);
            const hasClaimed = userBetsData[3];
            
            const totalBet = betHome + betAway + betDraw;
            
            console.log(`   - User bets: home=${betHome.toString()}, away=${betAway.toString()}, draw=${betDraw.toString()}`);
            console.log(`   - Total bet: ${totalBet.toString()}`);
            
            if (totalBet > 0n) {
              const result = Number(info[info.length - 2]);
              const allBets = [];
              
              // Collect all bets user made
              if (betHome > 0n) allBets.push({ choice: 1, amount: betHome, odds: Number(info[4]) });
              if (betAway > 0n) allBets.push({ choice: 2, amount: betAway, odds: Number(info[5]) });
              if (betDraw > 0n) allBets.push({ choice: 3, amount: betDraw, odds: Number(info[6]) });
              
              // Fetch team images
              let team1Image = '';
              let team2Image = '';
              try {
                const images = await matchContract.getTeamImages();
                team1Image = images[0] || '';
                team2Image = images[1] || '';
              } catch (e) {
                console.log('   ⚠️ Could not fetch team images');
              }
              
              console.log(`   ✅ Adding to history: ${info[0]} vs ${info[1]} (${allBets.length} bets)`);
              
              userHistory.push({
                address: addr,
                team1: info[0],
                team2: info[1],
                team1Image: team1Image,
                team2Image: team2Image,
                matchStartTime: Number(info[2]),
                result: result,
                allBets: allBets,
                totalBetAmount: totalBet,
                hasClaimed: hasClaimed,
                hasDraw: true
              });
            } else {
            console.log(`   ⏭️ Skipped: No bets from this user`);
          }
        } else {
          console.log(`   ⏭️ Skipped: Not finalized yet`);
        }
        } catch (err) {
          console.error(`   ❌ Error processing match ${addr}:`, err);
        }
      }

      // Check NoDraw matches
      for (let addr of matchesNoDraw) {
        try {
          const matchContract = new ethers.Contract(addr, matchNoDrawAbi, provider);
          const info = await matchContract.getMatchInfo();
          const finalized = info[info.length - 1];
          
          console.log(`🔍 NoDraw Match ${addr}:`);
          console.log(`   - Teams: ${info[0]} vs ${info[1]}`);
          console.log(`   - Finalized: ${finalized}`);
          
          if (finalized) {
            const userBetsData = await matchContract.getUserBets(address);
            const betA = BigInt(userBetsData[0]);
            const betB = BigInt(userBetsData[1]);
            const hasClaimed = userBetsData[2];
            
            const totalBet = betA + betB;
            
            console.log(`   - User bets: A=${betA.toString()}, B=${betB.toString()}`);
            console.log(`   - Total bet: ${totalBet.toString()}`);
            
            if (totalBet > 0n) {
              const result = Number(info[info.length - 2]);
              const allBets = [];
              
              // Collect all bets user made
              if (betA > 0n) allBets.push({ choice: 1, amount: betA, odds: Number(info[4]) });
              if (betB > 0n) allBets.push({ choice: 2, amount: betB, odds: Number(info[5]) });
              
              // Fetch team images
              let team1Image = '';
              let team2Image = '';
              try {
                const images = await matchContract.getTeamImages();
                team1Image = images[0] || '';
                team2Image = images[1] || '';
              } catch (e) {
                console.log('   ⚠️ Could not fetch team images');
              }
              
              console.log(`   ✅ Adding to history: ${info[0]} vs ${info[1]} (${allBets.length} bets)`);
              
              userHistory.push({
                address: addr,
                team1: info[0],
                team2: info[1],
                team1Image: team1Image,
                team2Image: team2Image,
                matchStartTime: Number(info[2]),
                result: result,
                allBets: allBets,
                totalBetAmount: totalBet,
                hasClaimed: hasClaimed,
                hasDraw: false
              });
            } else {
            console.log(`   ⏭️ Skipped: No bets from this user`);
          }
        } else {
          console.log(`   ⏭️ Skipped: Not finalized yet`);
        }
        } catch (err) {
          console.error(`   ❌ Error processing match ${addr}:`, err);
        }
      }

        } catch (factoryError) {
          console.error(`❌ Error fetching from factory ${factory.name}:`, factoryError);
        }
      }

      console.log('✅ Final user history:', userHistory);
      setHistory(userHistory);
    } catch (error) {
      console.error('❌ Error fetching user history:', error);
      setHistory([]);
    }
    setLoading(false);
  };

  const getChoiceName = (choice, match) => {
    if (choice === 1) return match.team1;
    if (choice === 2) return match.team2;
    if (choice === 3) return 'Draw';
    return 'Unknown';
  };

  const formatMatchDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getResultName = (match) => {
    if (match.result === 1) return match.team1;
    if (match.result === 2) return match.team2;
    if (match.result === 3 && match.hasDraw) return 'Draw';
    if (match.result === 3 && !match.hasDraw) return 'Cancelled';
    if (match.result === 4) return 'Cancelled';
    return 'Unknown';
  };

  const getStatusBadge = (match) => {
    const isCancelled = match.result === 4 || (match.result === 3 && !match.hasDraw);
    
    if (isCancelled) {
      return (
        <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded-full">
          <i className="fa-solid fa-rotate-left mr-1"></i>
          Refunded
        </span>
      );
    }
    
    // Check if any bet won
    const hasWinningBet = match.allBets.some(bet => bet.choice === match.result);
    
    if (hasWinningBet) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
          <i className="fa-solid fa-trophy mr-1"></i>
          Won
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
        <i className="fa-solid fa-times mr-1"></i>
        Lost
      </span>
    );
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-[#141414] rounded-2xl w-full max-w-3xl border border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-clock-rotate-left text-[#69d169]"></i>
              <h2 className="text-xl text-white font-bold">Bet History</h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Factory Selector - Local to this modal */}
            {factories.length > 1 && (
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-300 mb-3 block flex items-center">
                  <i className="fa-solid fa-filter text-[#69d169] mr-2"></i>
                  Filter by Factory
                </label>
                
                {/* Desktop: Custom Dropdown */}
                <div className="hidden md:block relative z-10">
                  {/* Dropdown Button */}
                  <button
                    onClick={() => setIsDesktopDropdownOpen(!isDesktopDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-[#69d169]/20 hover:border-[#69d169]/40 focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all duration-200 shadow-lg hover:shadow-xl group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,20,0.95) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Icon Box */}
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 flex items-center justify-center border border-[#69d169]/30 group-hover:border-[#69d169]/50 transition-all flex-shrink-0">
                        <i className="fa-solid fa-building text-[#69d169] text-sm"></i>
                      </div>
                      {/* Text */}
                      <span className="text-white font-semibold text-base">
                        {selectedFactory 
                          ? factories.find(f => f.address === selectedFactory)?.name || 'Select Factory'
                          : 'Select Factory to View History'
                        }
                      </span>
                    </div>
                    {/* Chevron */}
                    <i className={`fa-solid fa-chevron-down text-[#69d169] transition-transform ${isDesktopDropdownOpen ? 'rotate-180' : ''}`}></i>
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
                      <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border-2 border-[#69d169]/30 shadow-2xl overflow-hidden z-[151] animate-fade-in">
                        <div className="max-h-[400px] overflow-y-auto">
                          {/* Placeholder Option */}
                          <button
                            onClick={() => {
                              setSelectedFactory('');
                              setIsDesktopDropdownOpen(false);
                            }}
                            className={`w-full text-left px-5 py-4 transition-all border-b border-[#69d169]/10 ${
                              !selectedFactory
                                ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 text-white'
                                : 'hover:bg-white/5 text-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Select Factory to View History</span>
                              {!selectedFactory && <i className="fa-solid fa-check text-[#69d169]"></i>}
                            </div>
                          </button>

                          {/* Factory Options */}
                          {factories.map((factory, index) => {
                            const totalMatches = factory.totalMatchesWithDraw + factory.totalMatchesNoDraw;
                            const isSelected = selectedFactory === factory.address;
                            
                            return (
                              <button
                                key={factory.address}
                                onClick={() => {
                                  setSelectedFactory(factory.address);
                                  setIsDesktopDropdownOpen(false);
                                }}
                                className={`w-full text-left px-5 py-4 transition-all ${
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
                                    <span className={`font-semibold ${isSelected ? 'text-white' : factory.active ? 'text-white' : 'text-gray-400'}`}>
                                      {factory.name}
                                    </span>
                                  </div>
                                  {isSelected && <i className="fa-solid fa-check text-[#69d169]"></i>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Old Native Select - Hidden but kept for fallback */}
                <div className="hidden relative z-10 group">
                  {/* Icon Container */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 flex items-center justify-center border border-[#69d169]/30 group-hover:border-[#69d169]/50 transition-all">
                      <i className="fa-solid fa-building text-[#69d169] text-sm"></i>
                    </div>
                  </div>
                  
                  {/* Select Dropdown */}
                  <select
                    value={selectedFactory || ''}
                    onChange={(e) => {
                      setSelectedFactory(e.target.value);
                      // Will trigger fetchUserHistory via useEffect
                    }}
                    className="relative z-20 w-full text-white pl-14 pr-12 py-4 rounded-xl border-2 border-[#69d169]/20 hover:border-[#69d169]/40 focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all duration-200 appearance-none cursor-pointer font-semibold text-base shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,20,0.95) 100%)',
                      backgroundImage: `linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,20,0.95) 100%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2369d169'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat, no-repeat',
                      backgroundPosition: 'center, right 1rem center',
                      backgroundSize: 'cover, 1.25rem',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <option 
                      value="" 
                      style={{ 
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                        color: '#9ca3af', 
                        padding: '16px 20px',
                        fontSize: '15px',
                        fontWeight: '600',
                        borderBottom: '1px solid rgba(105, 209, 105, 0.1)'
                      }}
                    >
                      Select Factory to View History
                    </option>
                    {factories.map((factory, index) => {
                      const totalMatches = factory.totalMatchesWithDraw + factory.totalMatchesNoDraw;
                      const status = factory.active ? '✅ Active' : '📦 Archived';
                      const emoji = factory.active ? '🏆' : '📁';
                      const isLast = index === factories.length - 1;
                      
                      return (
                        <option 
                          key={factory.address} 
                          value={factory.address}
                          style={{ 
                            background: factory.active 
                              ? 'linear-gradient(135deg, #1a1a1a 0%, #141414 100%)'
                              : 'linear-gradient(135deg, #151515 0%, #0f0f0f 100%)',
                            color: factory.active ? '#ffffff' : '#9ca3af',
                            padding: '16px 20px',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderBottom: isLast ? 'none' : '1px solid rgba(105, 209, 105, 0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          {emoji} {factory.name} • {totalMatches} matches • {status}
                        </option>
                      );
                    })}
                  </select>
                  
                  {/* Decorative Glow Effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#69d169]/0 via-[#69d169]/5 to-[#69d169]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>

                {/* Mobile: Custom Dropdown (same as desktop) */}
                <div className="md:hidden relative z-10">
                  {/* Dropdown Button */}
                  <button
                    onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-[#69d169]/20 hover:border-[#69d169]/40 focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all duration-200 shadow-lg hover:shadow-xl group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,20,0.95) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Icon Box */}
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 flex items-center justify-center border border-[#69d169]/30 group-hover:border-[#69d169]/50 transition-all flex-shrink-0">
                        <i className="fa-solid fa-building text-[#69d169] text-sm"></i>
                      </div>
                      {/* Text */}
                      <span className="text-white font-semibold text-base">
                        {selectedFactory 
                          ? factories.find(f => f.address === selectedFactory)?.name || 'Select Factory'
                          : 'Select Factory to View History'
                        }
                      </span>
                    </div>
                    {/* Chevron */}
                    <i className={`fa-solid fa-chevron-down text-[#69d169] transition-transform ${isMobileDropdownOpen ? 'rotate-180' : ''}`}></i>
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
                          {/* Placeholder Option */}
                          <button
                            onClick={() => {
                              setSelectedFactory('');
                              setIsMobileDropdownOpen(false);
                            }}
                            className={`w-full text-left px-5 py-4 transition-all border-b border-[#69d169]/10 ${
                              !selectedFactory
                                ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 text-white'
                                : 'hover:bg-white/5 text-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Select Factory to View History</span>
                              {!selectedFactory && <i className="fa-solid fa-check text-[#69d169]"></i>}
                            </div>
                          </button>

                          {/* Factory Options */}
                          {factories.map((factory, index) => {
                            const isSelected = selectedFactory === factory.address;
                            
                            return (
                              <button
                                key={factory.address}
                                onClick={() => {
                                  setSelectedFactory(factory.address);
                                  setIsMobileDropdownOpen(false);
                                }}
                                className={`w-full text-left px-5 py-4 transition-all ${
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
                                    <span className={`font-semibold ${isSelected ? 'text-white' : factory.active ? 'text-white' : 'text-gray-400'}`}>
                                      {factory.name}
                                    </span>
                                  </div>
                                  {isSelected && <i className="fa-solid fa-check text-[#69d169]"></i>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {!window.ethereum || !userAddress ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/30">
                  <i className="fa-solid fa-wallet text-4xl text-[#69d169]"></i>
                </div>
                <p className="text-white font-semibold text-lg mb-2">Wallet Not Connected</p>
                <p className="text-gray-400 text-sm mb-4">
                  Please connect your wallet to view your betting history
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-black font-bold rounded-xl transition-all text-sm"
                >
                  Close
                </button>
              </div>
            ) : !selectedFactory ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/30">
                  <i className="fa-solid fa-hand-pointer text-3xl text-[#69d169]"></i>
                </div>
                <p className="text-white font-semibold text-lg mb-2">Select a Factory</p>
                <p className="text-gray-400 text-sm">
                  Choose a factory above to view your betting history
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-[#69d169] mb-2"></i>
                <p className="text-gray-400">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <i className="fa-solid fa-inbox text-4xl text-gray-600 mb-2"></i>
                <p className="text-gray-400">No betting history</p>
                <p className="text-sm text-gray-500 mt-2">
                  Place a bet to see your history!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((match, index) => (
                  <div 
                    key={index}
                    className="bg-black/40 rounded-lg p-4 border border-white/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          {formatMatchDate(match.matchStartTime)}
                        </div>
                        <div className="text-sm font-semibold text-white mb-1">
                          {match.team1} vs {match.team2}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {match.address.slice(0, 6)}...{match.address.slice(-4)}
                        </div>
                      </div>
                      {getStatusBadge(match)}
                    </div>

                    <div className="space-y-2">
                      <div className="text-gray-400 text-xs mb-2">Your Bets:</div>
                      {match.allBets.map((bet, betIndex) => (
                        <BetItemHistory 
                          key={betIndex}
                          bet={bet}
                          match={match}
                          getChoiceName={getChoiceName}
                        />
                      ))}
                      
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <div className="text-gray-400 text-xs">Result:</div>
                        <div className="text-white font-semibold text-sm">
                          {getResultName(match)}
                        </div>
                      </div>
                    </div>

                    {match.allBets.some(bet => bet.choice === match.result) && !match.hasClaimed && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-yellow-500">
                          <i className="fa-solid fa-exclamation-circle mr-1"></i>
                          Rewards not claimed yet. Go to Rewards to claim!
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </>
  );

  return createPortal(modalContent, document.body);
};

export default UserHistoryModal;
