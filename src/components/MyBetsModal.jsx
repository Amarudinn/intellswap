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
const BetItem = ({ bet, match, formatAmount, getChoiceName }) => {
  const [imageError, setImageError] = useState(false);
  const potentialPayout = (bet.amount * BigInt(bet.odds || 100)) / 100n;
  const rawTeamImage = bet.choice === 1 ? match.team1Image : bet.choice === 2 ? match.team2Image : '';
  const teamImage = convertIpfsUrl(rawTeamImage);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-[#69d169]/10 to-[#69d169]/5 border border-[#69d169]/20">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 rounded-lg flex items-center justify-center border border-[#69d169]/30 overflow-hidden">
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
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-bold">
              {getChoiceName(bet.choice, match)}
            </span>
            <span className="text-[10px] text-[#69d169] bg-[#69d169]/20 px-2 py-0.5 rounded-full font-bold border border-[#69d169]/30">
              {(bet.odds / 100).toFixed(2)}x
            </span>
          </div>
          <div className="text-gray-400 text-xs mt-0.5">
            {formatAmount(Number(bet.amount) / 1e18)} MNT
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Potential Payout</div>
        <div className="text-[#69d169] text-sm font-bold flex items-center justify-end">
          <i className="fa-solid fa-trophy text-[10px] mr-1"></i>
          {formatAmount(Number(potentialPayout) / 1e18)}
        </div>
      </div>
    </div>
  );
};

const MyBetsModal = ({ isOpen, onClose, factoryAddress, factoryAbi, matchWithDrawAbi, matchNoDrawAbi, userAddress, fetchFromAllFactories = false }) => {
  const { currentFactory, factories } = useFactory();
  const [activeBets, setActiveBets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use currentFactory from context, fallback to prop
  const activeFactory = currentFactory || factoryAddress;

  // Smart decimal formatter
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return num % 1 === 0 ? num.toString() : num.toFixed(4).replace(/\.?0+$/, '');
  };

  useEffect(() => {
    if (isOpen) {
      // Check if wallet is connected
      if (!window.ethereum || !userAddress) {
        setActiveBets([]);
        setLoading(false);
        return;
      }
      if (fetchFromAllFactories || activeFactory) {
        fetchActiveBets();
      }
    }
  }, [isOpen, userAddress, activeFactory, fetchFromAllFactories]);

  const fetchActiveBets = async () => {
    setLoading(true);
    try {
      console.log('🎯 Fetching active bets...');
      console.log('   - Fetch from all factories:', fetchFromAllFactories);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = userAddress || await signer.getAddress();
      
      console.log('👤 User Address:', address);
      
      if (!address) {
        console.error('❌ No wallet connected');
        setActiveBets([]);
        setLoading(false);
        return;
      }
      
      const userBets = [];
      
      if (fetchFromAllFactories) {
        // Fetch from all factories
        console.log('📊 Fetching from all factories:', factories.length);
        
        for (const factory of factories) {
          try {
            const factoryContract = new ethers.Contract(factory.address, factoryAbi, provider);
            const matchesWithDraw = await factoryContract.getActiveMatchesWithDraw();
            const matchesNoDraw = await factoryContract.getActiveMatchesNoDraw();
            
            console.log(`   - Factory ${factory.name}: ${matchesWithDraw.length + matchesNoDraw.length} matches`);
            
            // Process WithDraw matches
            await processWithDrawMatches(matchesWithDraw, factory, provider, address, userBets);
            
            // Process NoDraw matches
            await processNoDrawMatches(matchesNoDraw, factory, provider, address, userBets);
          } catch (err) {
            console.error(`   ❌ Error fetching from factory ${factory.address}:`, err);
          }
        }
      } else {
        // Fetch from single factory
        const factoryContract = new ethers.Contract(activeFactory, factoryAbi, provider);
        const matchesWithDraw = await factoryContract.getActiveMatchesWithDraw();
        const matchesNoDraw = await factoryContract.getActiveMatchesNoDraw();
        
        console.log('📊 Active matches:', matchesWithDraw.length + matchesNoDraw.length);
        
        // Process WithDraw matches
        await processWithDrawMatches(matchesWithDraw, null, provider, address, userBets);
        
        // Process NoDraw matches
        await processNoDrawMatches(matchesNoDraw, null, provider, address, userBets);
      }

      console.log('✅ Total active bets:', userBets.length);
      setActiveBets(userBets);
    } catch (error) {
      console.error('❌ Error fetching active bets:', error);
      setActiveBets([]);
    }
    setLoading(false);
  };

  const processWithDrawMatches = async (matchesWithDraw, factory, provider, address, userBets) => {
    for (let addr of matchesWithDraw) {
      try {
          const matchContract = new ethers.Contract(addr, matchWithDrawAbi, provider);
          const info = await matchContract.getMatchInfo();
          const finalized = info[info.length - 1];
          
          console.log(`🔍 WithDraw Match ${addr}:`);
          console.log(`   - Teams: ${info[0]} vs ${info[1]}`);
          console.log(`   - Finalized: ${finalized}`);
          
          if (!finalized) {
            const userBetsData = await matchContract.getUserBets(address);
            const betHome = BigInt(userBetsData[0]);
            const betAway = BigInt(userBetsData[1]);
            const betDraw = BigInt(userBetsData[2]);
            const totalBet = betHome + betAway + betDraw;
            
            console.log(`   - User bets: home=${betHome.toString()}, away=${betAway.toString()}, draw=${betDraw.toString()}`);
            
            if (totalBet > 0n) {
              const allBets = [];
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
              
              console.log(`   ✅ Active bet found!`);
              
              userBets.push({
                address: addr,
                team1: info[0],
                team2: info[1],
                team1Image: team1Image,
                team2Image: team2Image,
                matchStartTime: Number(info[2]),
                allBets: allBets,
                totalBetAmount: totalBet,
                hasDraw: true,
                factoryName: factory ? factory.name : null
              });
            } else {
              console.log(`   ⏭️ No bets from this user`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error processing match ${addr}:`, err);
        }
      }
    };

    const processNoDrawMatches = async (matchesNoDraw, factory, provider, address, userBets) => {
      // Check NoDraw matches
      for (let addr of matchesNoDraw) {
        try {
          const matchContract = new ethers.Contract(addr, matchNoDrawAbi, provider);
          const info = await matchContract.getMatchInfo();
          const finalized = info[info.length - 1];
          
          console.log(`🔍 NoDraw Match ${addr}:`);
          console.log(`   - Teams: ${info[0]} vs ${info[1]}`);
          console.log(`   - Finalized: ${finalized}`);
          
          if (!finalized) {
            const userBetsData = await matchContract.getUserBets(address);
            const betA = BigInt(userBetsData[0]);
            const betB = BigInt(userBetsData[1]);
            const totalBet = betA + betB;
            
            console.log(`   - User bets: A=${betA.toString()}, B=${betB.toString()}`);
            
            if (totalBet > 0n) {
              const allBets = [];
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
              
              console.log(`   ✅ Active bet found!`);
              
              userBets.push({
                address: addr,
                team1: info[0],
                team2: info[1],
                team1Image: team1Image,
                team2Image: team2Image,
                matchStartTime: Number(info[2]),
                allBets: allBets,
                totalBetAmount: totalBet,
                hasDraw: false,
                factoryName: factory ? factory.name : null
              });
            } else {
              console.log(`   ⏭️ No bets from this user`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error processing match ${addr}:`, err);
        }
      }
    };

  const getChoiceName = (choice, match) => {
    if (choice === 1) return match.team1;
    if (choice === 2) return match.team2;
    if (choice === 3) return 'Draw';
    return 'Unknown';
  };

  const formatTimeLeft = (matchStartTime) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = matchStartTime - now;
    
    if (timeLeft <= 0) return 'Started';
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl w-full max-w-3xl border border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-5 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-ticket text-[#69d169]"></i>
              <h2 className="text-lg text-white font-bold">My Active Bets</h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-2xl transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!window.ethereum || !userAddress ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/30">
                  <i className="fa-solid fa-wallet text-4xl text-[#69d169]"></i>
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-2">Wallet Not Connected</p>
                <p className="text-sm text-gray-500 mb-4">
                  Please connect your wallet to view your active bets
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-black font-bold rounded-xl transition-all text-sm"
                >
                  Close
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-[#69d169] mb-3"></i>
                <p className="text-gray-400 font-semibold">Loading your bets...</p>
              </div>
            ) : activeBets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-700/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-ticket text-3xl text-gray-600"></i>
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-2">No Active Bets</p>
                <p className="text-sm text-gray-500">
                  Place a bet on upcoming matches to see them here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBets.map((match, index) => (
                  <div 
                    key={index}
                    className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-4 border border-white/5 hover:border-[#69d169]/30 transition-all"
                  >
                    {/* Match Header */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-white/5">
                      <div className="flex-1">
                        {match.factoryName && (
                          <div className="inline-flex items-center px-2 py-0.5 bg-[#69d169]/10 rounded-full border border-[#69d169]/30 mb-2">
                            <i className="fa-solid fa-building text-[#69d169] text-[9px] mr-1"></i>
                            <span className="text-[10px] text-[#69d169] font-bold">{match.factoryName}</span>
                          </div>
                        )}
                        <div className="text-base font-bold text-white mb-1">
                          {match.team1} vs {match.team2}
                        </div>
                        <a
                          href={`https://sepolia.mantlescan.xyz/address/${match.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-[#69d169] font-mono transition-colors flex items-center space-x-1"
                        >
                          <i className="fa-solid fa-link text-[10px]"></i>
                          <span>{match.address.slice(0, 6)}...{match.address.slice(-4)}</span>
                        </a>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Starts in</div>
                        <div className="px-2.5 py-1 bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 rounded-lg border border-[#69d169]/30">
                          <div className="text-xs text-[#69d169] font-bold flex items-center">
                            <i className="fa-solid fa-clock text-[10px] mr-1"></i>
                            {formatTimeLeft(match.matchStartTime)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bets List */}
                    <div className="space-y-2">
                      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center">
                        <i className="fa-solid fa-list-check text-[#69d169] mr-1.5"></i>
                        Your Bets
                      </div>
                      {match.allBets.map((bet, betIndex) => (
                        <BetItem 
                          key={betIndex}
                          bet={bet}
                          match={match}
                          formatAmount={formatAmount}
                          getChoiceName={getChoiceName}
                        />
                      ))}
                      
                      {/* Total */}
                      <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-gray-300 text-xs font-bold uppercase tracking-wide">
                          Total Bet
                        </span>
                        <span className="text-white font-bold text-sm">
                          {formatAmount(Number(match.totalBetAmount) / 1e18)} MNT
                        </span>
                      </div>
                    </div>
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

export default MyBetsModal;
