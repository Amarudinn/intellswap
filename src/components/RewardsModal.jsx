import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import { useFactory } from '../context/FactoryContext';

const RewardsModal = ({ isOpen, onClose, factoryAddress, factoryAbi, matchWithDrawAbi, matchNoDrawAbi, userAddress }) => {
  const { currentFactory, factories } = useFactory();
  const [claimableMatches, setClaimableMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(null);

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
        setClaimableMatches([]);
        setLoading(false);
        return;
      }
      fetchClaimableRewards();
    }
  }, [isOpen, userAddress]);

  const fetchClaimableRewards = async () => {
    setLoading(true);
    try {
      console.log('🏆 Fetching claimable rewards from all factories...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = userAddress || await signer.getAddress();
      
      console.log('👤 User Address:', address);
      
      if (!address) {
        console.error('❌ No wallet connected');
        setClaimableMatches([]);
        setLoading(false);
        return;
      }
      
      const claimable = [];

      // Fetch from all factories
      console.log('📊 Fetching from all factories:', factories.length);
      
      for (const factory of factories) {
        try {
          console.log(`🏭 Checking factory: ${factory.name}`);
          const factoryContract = new ethers.Contract(factory.address, factoryAbi, provider);

          // Get all matches
          const matchesWithDraw = await factoryContract.getAllMatchesWithDraw();
          const matchesNoDraw = await factoryContract.getAllMatchesNoDraw();

          console.log(`   - Total matches: ${matchesWithDraw.length + matchesNoDraw.length}`);

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
            const hasClaimed = userBetsData[3]; // Last parameter is hasClaimed
            const totalBet = betHome + betAway + betDraw;
            const result = Number(info[info.length - 2]);
            
            console.log(`   - User bets: home=${betHome.toString()}, away=${betAway.toString()}, draw=${betDraw.toString()}`);
            console.log(`   - Result: ${result}`);
            console.log(`   - Has claimed: ${hasClaimed}`);
            
            // Check if user won
            const isWinner = (result === 1 && betHome > 0n) || 
                           (result === 2 && betAway > 0n) || 
                           (result === 3 && betDraw > 0n) ||
                           (result === 4 && totalBet > 0n); // Cancelled = refund
            
            console.log(`   - Is winner: ${isWinner}`);
            
            if (!hasClaimed && totalBet > 0n && isWinner) {
              // Calculate payout
              let payout = 0n;
              const isCancelled = result === 4;
              
              if (isCancelled) {
                payout = totalBet; // Refund all bets
              } else {
                if (result === 1 && betHome > 0n) {
                  const odds = Number(info[4]) || 100;
                  payout = (betHome * BigInt(odds)) / 100n;
                } else if (result === 2 && betAway > 0n) {
                  const odds = Number(info[5]) || 100;
                  payout = (betAway * BigInt(odds)) / 100n;
                } else if (result === 3 && betDraw > 0n) {
                  const odds = Number(info[6]) || 100;
                  payout = (betDraw * BigInt(odds)) / 100n;
                }
              }
              
              console.log(`   ✅ Claimable reward found! Payout: ${payout.toString()}`);
              claimable.push({
                address: addr,
                abi: matchWithDrawAbi,
                team1: info[0],
                team2: info[1],
                result: result,
                payout: payout,
                hasDraw: true,
                factoryName: factory.name
              });
            } else {
              if (hasClaimed) console.log(`   ⏭️ Already claimed`);
              if (totalBet === 0n) console.log(`   ⏭️ No bets`);
              if (!isWinner) console.log(`   ⏭️ Not a winner`);
            }
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
            const hasClaimed = userBetsData[2]; // Last parameter is hasClaimed
            const totalBet = betA + betB;
            const result = Number(info[info.length - 2]);
            
            console.log(`   - User bets: A=${betA.toString()}, B=${betB.toString()}`);
            console.log(`   - Result: ${result}`);
            console.log(`   - Has claimed: ${hasClaimed}`);
            
            // Check if user won
            const isWinner = (result === 1 && betA > 0n) || 
                           (result === 2 && betB > 0n) ||
                           (result === 3 && totalBet > 0n); // Cancelled = refund
            
            console.log(`   - Is winner: ${isWinner}`);
            
            if (!hasClaimed && totalBet > 0n && isWinner) {
              // Calculate payout
              let payout = 0n;
              const isCancelled = result === 3;
              
              if (isCancelled) {
                payout = totalBet; // Refund all bets
              } else {
                if (result === 1 && betA > 0n) {
                  const odds = Number(info[4]) || 100;
                  payout = (betA * BigInt(odds)) / 100n;
                } else if (result === 2 && betB > 0n) {
                  const odds = Number(info[5]) || 100;
                  payout = (betB * BigInt(odds)) / 100n;
                }
              }
              
              console.log(`   ✅ Claimable reward found! Payout: ${payout.toString()}`);
              claimable.push({
                address: addr,
                abi: matchNoDrawAbi,
                team1: info[0],
                team2: info[1],
                result: result,
                payout: payout,
                hasDraw: false,
                factoryName: factory.name
              });
            } else {
              if (hasClaimed) console.log(`   ⏭️ Already claimed`);
              if (totalBet === 0n) console.log(`   ⏭️ No bets`);
              if (!isWinner) console.log(`   ⏭️ Not a winner`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error processing match ${addr}:`, err);
        }
      }

        } catch (factoryError) {
          console.error(`❌ Error fetching from factory ${factory.name}:`, factoryError);
        }
      }

      console.log('✅ Total claimable rewards:', claimable.length);
      setClaimableMatches(claimable);
    } catch (error) {
      console.error('❌ Error fetching claimable rewards:', error);
      setClaimableMatches([]);
    }
    setLoading(false);
  };

  const handleClaim = async (match) => {
    setClaiming(match.address);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const matchContract = new ethers.Contract(match.address, match.abi, signer);

      const tx = await matchContract.claim();
      console.log('Claim transaction sent:', tx.hash);
      await tx.wait();

      await Swal.fire({
        icon: 'success',
        title: 'Rewards Claimed!',
        text: 'Rewards claimed successfully!',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      fetchClaimableRewards(); // Refresh list
    } catch (error) {
      console.error('Error claiming rewards:', error);
      if (error.code === 4001) {
        await Swal.fire({
          icon: 'info',
          title: 'Transaction Cancelled',
          text: 'Transaction rejected by user',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else if (error.message.includes('No winnings')) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Rewards',
          text: 'You did not win this match. No rewards to claim.',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Claim Failed',
          text: error.message || 'Failed to claim rewards',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      }
    } finally {
      setClaiming(null);
    }
  };

  const getResultName = (match) => {
    if (match.result === 1) return match.team1;
    if (match.result === 2) return match.team2;
    if (match.result === 3 && match.hasDraw) return 'Draw';
    if (match.result === 3 && !match.hasDraw) return 'Cancelled';
    if (match.result === 4) return 'Cancelled';
    return 'Unknown';
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl w-full max-w-2xl border border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-trophy text-[#69d169]"></i>
              <h2 className="text-lg text-white font-bold">Claim Rewards</h2>
              {claimableMatches.length > 0 && (
                <span className="px-2 py-0.5 bg-[#69d169]/20 text-[#69d169] text-xs font-bold rounded-full border border-[#69d169]/30">
                  {claimableMatches.length}
                </span>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-2xl transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {!window.ethereum || !userAddress ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/30">
                  <i className="fa-solid fa-wallet text-4xl text-[#69d169]"></i>
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-2">Wallet Not Connected</p>
                <p className="text-sm text-gray-500 mb-4">
                  Please connect your wallet to view and claim your rewards
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
                <p className="text-gray-400 font-semibold">Loading rewards...</p>
              </div>
            ) : claimableMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/30">
                  <i className="fa-solid fa-gift text-4xl text-[#69d169]"></i>
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-2">No Rewards Available</p>
                <p className="text-sm text-gray-500">
                  Win a bet to earn rewards and claim them here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimableMatches.map((match) => (
                  <div 
                    key={match.address}
                    className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-4 border border-white/5 hover:border-[#69d169]/30 transition-all"
                  >
                    {/* Match Info */}
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
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Result</div>
                        <div className="px-2.5 py-1 bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 rounded-lg border border-[#69d169]/30">
                          <div className="text-xs text-[#69d169] font-bold flex items-center">
                            <i className="fa-solid fa-check-circle text-[10px] mr-1"></i>
                            {getResultName(match)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Amount */}
                    <div className="bg-gradient-to-r from-[#69d169]/10 to-[#69d169]/5 border border-[#69d169]/20 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 rounded-lg flex items-center justify-center border border-[#69d169]/30">
                            <i className="fa-solid fa-trophy text-[#69d169]"></i>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Your Reward</div>
                            <div className="text-xs text-gray-500">Ready to claim</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <i className="fa-solid fa-coins text-[#69d169] text-sm"></i>
                            <span className="text-xl font-bold text-[#69d169]">
                              {formatAmount(Number(match.payout) / 1e18)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">MNT</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Claim Button */}
                    <button
                      onClick={() => handleClaim(match)}
                      disabled={claiming === match.address}
                      className="w-full bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg hover:shadow-xl"
                    >
                      {claiming === match.address ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                          Claiming Rewards...
                        </>
                      ) : (
                        <>
                          Claim {formatAmount(Number(match.payout) / 1e18)} MNT
                        </>
                      )}
                    </button>
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

export default RewardsModal;
