import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import BetModal from './BetModal';
import BetHistoryModal from './BetHistoryModal';
import DepositLiquidityModal from './DepositLiquidityModal';

const MatchCard = ({ 
  matchAddress, 
  matchAbi, 
  matchType,
  factoryContract,
  factoryAddress,
  factoryAbi,
  league: leagueProp,
  isActive,
  isAdmin = false, 
  onFinalizeResult,
  onDeleteMatch
}) => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState(null);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Smart decimal formatter - removes trailing zeros
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '');
  };

  useEffect(() => {
    fetchMatchData();
  }, [matchAddress]);

  const fetchMatchData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(matchAddress, matchAbi, provider);

      const info = await contract.getMatchInfo();
      
      // Get betting pools data
      const pools = await contract.getBettingPools();
      const ownerLiquidity = Number(pools[pools.length - 1]); // Last element is owner liquidity
      
      // Calculate total bets
      let totalBets = Number(pools[0]) + Number(pools[1]); // betsHome + betsAway
      if (pools.length > 3) {
        totalBets += Number(pools[2]); // betsDraw if exists
      }
      
      // Get actual contract balance (this is the real pool available)
      const contractBalance = await provider.getBalance(matchAddress);
      const totalPool = Number(contractBalance);
      
      // Get league - use prop first, then fetch from contract
      let league = leagueProp || '';
      
      if (!league && factoryContract) {
        try {
          league = await factoryContract.matchLeague(matchAddress);
          console.log(`📋 League for ${matchAddress}:`, league);
        } catch (e) {
          console.log('⚠️ Could not fetch league from contract');
        }
      }
      
      // If still no league, try from factoryAddress
      if (!league && factoryAddress && factoryAbi) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(factoryAddress, factoryAbi, provider);
          league = await contract.matchLeague(matchAddress);
          console.log(`📋 League from factoryAddress:`, league);
        } catch (e) {
          console.log('⚠️ Could not fetch league from factoryAddress');
        }
      }
      
      // Final fallback
      if (!league) {
        league = 'Sports Betting';
      }
      
      // Fetch team images
      let team1Image = '';
      let team2Image = '';
      try {
        const images = await contract.getTeamImages();
        team1Image = images[0] || '';
        team2Image = images[1] || '';
        console.log('Team images:', { team1Image, team2Image });
      } catch (e) {
        console.log('⚠️ Could not fetch team images (might be old contract)');
      }
      
      setMatchData({
        league: league,
        team1: info[0],
        team2: info[1],
        team1Image: team1Image,
        team2Image: team2Image,
        matchStartTime: Number(info[2]),
        oddsHome: Number(info[4]),
        oddsAway: Number(info[5]),
        oddsDraw: info.length > 8 ? Number(info[6]) : null,
        result: Number(info[info.length - 2]),
        finalized: info[info.length - 1],
        totalPool: totalPool,
        ownerLiquidity: ownerLiquidity,
        totalBets: totalBets
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching match data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#141414] rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/5 rounded mb-4"></div>
        <div className="h-4 bg-white/5 rounded mb-2"></div>
        <div className="h-4 bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!matchData) return null;

  const matchDate = new Date(matchData.matchStartTime * 1000);
  const isUpcoming = matchDate > new Date();

  const handleBetClick = (choice, teamName, odds, teamImage) => {
    console.log('handleBetClick:', { choice, teamName, odds, teamImage });
    setSelectedBet({ choice, teamName, odds, teamImage });
    setIsBetModalOpen(true);
  };

  const depositLiquidity = async (amount) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const matchContract = new ethers.Contract(matchAddress, matchAbi, signer);

      const value = ethers.parseEther(amount);
      const tx = await matchContract.depositLiquidity({ value });
      
      console.log('Deposit transaction sent:', tx.hash);
      await tx.wait();

      setIsDepositModalOpen(false); // Close modal on success
      
      await Swal.fire({
        icon: 'success',
        title: 'Liquidity Deposited!',
        text: `Successfully deposited ${amount} MNT as liquidity!`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      
      fetchMatchData(); // Refresh match data
    } catch (error) {
      console.error('Error depositing liquidity:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Deposit Failed',
        text: error.message || 'Failed to deposit liquidity',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };

  const withdrawProfit = async () => {
    const confirmResult = await Swal.fire({
      title: 'Withdraw Profit?',
      html: `
        <p style="margin-bottom: 10px;">Withdraw all profit from this match?</p>
        <div style="text-align: left; margin-top: 15px; padding: 15px; background: rgba(105, 209, 105, 0.1); border-radius: 8px; border: 1px solid rgba(105, 209, 105, 0.3);">
          <p style="margin: 5px 0;"><i class="fa-solid fa-info-circle" style="color: #69d169; margin-right: 8px;"></i>This will withdraw all available profit</p>
          <p style="margin: 5px 0;"><i class="fa-solid fa-info-circle" style="color: #69d169; margin-right: 8px;"></i>Transaction will be sent to your wallet</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Withdraw',
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#69d169',
      cancelButtonColor: '#6c757d',
      iconColor: '#69d169',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const matchContract = new ethers.Contract(matchAddress, matchAbi, signer);

      const tx = await matchContract.withdrawProfit();
      
      console.log('Withdraw transaction sent:', tx.hash);
      await tx.wait();

      await Swal.fire({
        icon: 'success',
        title: 'Profit Withdrawn!',
        text: 'Successfully withdrew profit!',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
    } catch (error) {
      console.error('Error withdrawing profit:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Withdrawal Failed',
        text: error.message || 'Failed to withdraw profit',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };



  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-4 border border-white/10 hover:border-[#69d169]/40 transition-all duration-300">
      {/* League Badge */}
      {matchData.league && (
        <div className="mb-3 inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 rounded-full border border-[#69d169]/30">
          <i className="fa-solid fa-trophy text-[#69d169] text-[10px] mr-1.5"></i>
          <span className="text-[10px] text-[#69d169] font-bold uppercase tracking-wide">{matchData.league}</span>
        </div>
      )}

      {/* Header: Date/Time & Status */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-1.5 text-xs text-gray-400">
          <i className="fa-solid fa-calendar text-[#69d169] text-[10px]"></i>
          <span>{matchDate.toLocaleDateString()}</span>
          <span>{matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {isUpcoming ? (
          <span className="px-2.5 py-1 bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 text-[#69d169] text-[10px] font-bold rounded-full border border-[#69d169]/30 flex items-center">
            <span className="w-1 h-1 bg-[#69d169] rounded-full mr-1.5 animate-pulse"></span>
            UPCOMING
          </span>
        ) : matchData.finalized ? (
          <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-[10px] font-bold rounded-full border border-gray-500/20">
            FINISHED
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-yellow-400 text-[10px] font-bold rounded-full border border-yellow-500/30 flex items-center">
            <span className="w-1 h-1 bg-yellow-400 rounded-full mr-1.5 animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      {/* Total Pool & Address */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-1.5">
          <a
            href={`https://sepolia.mantlescan.xyz/address/${matchAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-[#69d169] font-mono transition-colors cursor-pointer flex items-center space-x-1"
          >
            <i className="fa-solid fa-link text-[10px]"></i>
            <span>{matchAddress.slice(0, 6)}...{matchAddress.slice(-4)}</span>
          </a>
          {isAdmin && (
            <button
              onClick={() => setIsBetHistoryOpen(true)}
              className="text-gray-500 hover:text-[#69d169] transition-colors"
              title="View bet history"
            >
              <i className="fa-solid fa-book text-xs"></i>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-[#69d169]/10 to-[#69d169]/5 rounded-lg border border-[#69d169]/20">
          <span className="text-xs text-white font-bold">{formatAmount(matchData.totalPool / 1e18)}</span>
          <span className="text-[10px] text-gray-400">MNT</span>
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2 mb-4">
        {/* Team 1 */}
        <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg border border-white/5 hover:border-[#69d169]/30 transition-all group">
          <div className="flex items-center space-x-2 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-[#69d169]/20 group-hover:border-[#69d169]/40 transition-all overflow-hidden">
              {matchData.team1Image ? (
                <img 
                  src={matchData.team1Image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                  alt={matchData.team1}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <i className={`fa-solid fa-shield-halved text-[#69d169] text-sm ${matchData.team1Image ? 'hidden' : ''}`}></i>
            </div>
            <span className="text-white font-semibold text-base">{matchData.team1}</span>
          </div>
          <span className="text-[#69d169] font-bold text-lg">{(matchData.oddsHome / 100).toFixed(2)}x</span>
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center py-1">
          <div className="flex items-center space-x-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10"></div>
            <span className="text-gray-500 font-semibold text-xs">VS</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10"></div>
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg border border-white/5 hover:border-[#69d169]/30 transition-all group">
          <div className="flex items-center space-x-2 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-[#69d169]/20 group-hover:border-[#69d169]/40 transition-all overflow-hidden">
              {matchData.team2Image ? (
                <img 
                  src={matchData.team2Image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                  alt={matchData.team2}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <i className={`fa-solid fa-shield-halved text-[#69d169] text-sm ${matchData.team2Image ? 'hidden' : ''}`}></i>
            </div>
            <span className="text-white font-semibold text-base">{matchData.team2}</span>
          </div>
          <span className="text-[#69d169] font-bold text-lg">{(matchData.oddsAway / 100).toFixed(2)}x</span>
        </div>
      </div>

      {/* Betting Buttons */}
      {isAdmin ? (
        <div className="space-y-3 pt-4 border-t border-white/5">
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide flex items-center">
              <i className="fa-solid fa-user-shield text-[#69d169] mr-2"></i>
              Admin Control
            </span>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center ${
              matchData.finalized 
                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                : isActive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                matchData.finalized ? 'bg-gray-400' : isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></span>
              {matchData.finalized ? 'FINALIZED' : isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>

          {/* Finalize Buttons */}
          {/* Liquidity Management */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setIsDepositModalOpen(true)}
              disabled={matchData.finalized}
              className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 hover:brightness-90 text-blue-400 font-bold py-2 rounded-xl transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/20"
              title={matchData.finalized ? 'Cannot deposit after finalize' : 'Deposit liquidity'}
            >
              <i className="fa-solid fa-coins mr-2"></i>
              Deposit
            </button>
            
            <button
              onClick={withdrawProfit}
              disabled={!matchData.finalized}
              className="bg-gradient-to-r from-green-600/20 to-green-500/10 hover:brightness-90 text-green-400 font-bold py-2 rounded-xl transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed border border-green-500/20"
              title={matchData.finalized ? 'Withdraw profit' : 'Match must be finalized first'}
            >
              <i className="fa-solid fa-money-bill-transfer mr-2"></i>
              Withdraw
            </button>
          </div>

          {!matchData.finalized ? (
            <>
              <div className="text-xs text-gray-400 text-center mb-3 font-semibold uppercase tracking-wide flex items-center justify-center">
                <i className="fa-solid fa-flag-checkered text-[#69d169] mr-2"></i>
                Set Match Result
              </div>
              <div className={`grid ${matchData.oddsDraw ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3`}>
                <button
                  onClick={() => onFinalizeResult(matchAddress, matchAbi, 1, matchData.team1)}
                  className="bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                  title={`${matchData.team1} wins`}
                >
                  <span>1</span>
                  <span>{(matchData.oddsHome / 100).toFixed(2)}</span>
                </button>
                
                {matchData.oddsDraw && (
                  <button
                    onClick={() => onFinalizeResult(matchAddress, matchAbi, 3, 'Draw')}
                    className="bg-gradient-to-br from-gray-600 to-gray-700 hover:brightness-90 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                    title="Draw"
                  >
                    <span>draw</span>
                    <span>{(matchData.oddsDraw / 100).toFixed(2)}</span>
                  </button>
                )}
                
                <button
                  onClick={() => onFinalizeResult(matchAddress, matchAbi, 2, matchData.team2)}
                  className="bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                  title={`${matchData.team2} wins`}
                >
                  <span>2</span>
                  <span>{(matchData.oddsAway / 100).toFixed(2)}</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onFinalizeResult(matchAddress, matchAbi, matchData.oddsDraw ? 4 : 3, 'Cancelled')}
                  className="bg-gradient-to-r from-red-600/20 to-red-500/10 hover:brightness-90 text-red-400 font-bold py-2 rounded-xl transition-all text-xs border border-red-500/30"
                >
                  <i className="fa-solid fa-ban mr-2"></i>
                  Cancel
                </button>
                
                {onDeleteMatch && (
                  isActive ? (
                    <button
                      onClick={() => onDeleteMatch(matchAddress, false)}
                      className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 hover:brightness-90 text-orange-400 font-bold py-2 rounded-xl transition-all text-xs border border-orange-500/30"
                    >
                      <i className="fa-solid fa-eye-slash mr-2"></i>
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => onDeleteMatch(matchAddress, true)}
                      className="bg-gradient-to-r from-green-600/20 to-green-500/10 hover:brightness-90 text-green-400 font-bold py-2 rounded-xl transition-all text-xs border border-green-500/30"
                    >
                      <i className="fa-solid fa-eye mr-2"></i>
                      Show
                    </button>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/40 rounded-xl p-3 text-center">
              <i className="fa-solid fa-check-circle text-[#69d169] mr-2"></i>
              <span className="text-sm text-white font-bold">
                Result: <span className="text-[#69d169]">{
                  matchData.result === 1 ? matchData.team1 :
                  matchData.result === 2 ? matchData.team2 :
                  matchData.result === 3 && matchData.oddsDraw ? 'Draw' :
                  matchData.result === 3 && !matchData.oddsDraw ? 'Cancelled' :
                  matchData.result === 4 ? 'Cancelled' :
                  'Unknown'
                }</span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-4 border-t border-white/5">
          {isUpcoming && !matchData.finalized ? (
            <div className={`grid ${matchData.oddsDraw ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              <button 
                onClick={() => handleBetClick(1, matchData.team1, matchData.oddsHome, matchData.team1Image)}
                className="bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                title={`Bet on ${matchData.team1}`}
              >
                <span>1</span>
                <span>{(matchData.oddsHome / 100).toFixed(2)}</span>
              </button>

              {matchData.oddsDraw && (
                <button 
                  onClick={() => handleBetClick(3, 'Draw', matchData.oddsDraw, null)}
                  className="bg-gradient-to-br from-gray-600 to-gray-700 hover:brightness-90 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                  title="Bet on Draw"
                >
                  <span>draw</span>
                  <span>{(matchData.oddsDraw / 100).toFixed(2)}</span>
                </button>
              )}

              <button 
                onClick={() => handleBetClick(2, matchData.team2, matchData.oddsAway, matchData.team2Image)}
                className="bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold py-2 px-4 rounded-xl transition-all text-sm flex items-center justify-between"
                title={`Bet on ${matchData.team2}`}
              >
                <span>2</span>
                <span>{(matchData.oddsAway / 100).toFixed(2)}</span>
              </button>
            </div>
          ) : (
            <button 
              className="w-full bg-gradient-to-r from-gray-600/30 to-gray-700/30 text-gray-400 font-bold py-2 rounded-xl cursor-not-allowed text-sm border border-gray-600/30"
              disabled
            >
              <i className="fa-solid fa-lock mr-2"></i>
              {matchData.finalized ? 'Match Ended' : 'Betting Closed'}
            </button>
          )}
        </div>
      )}

      {/* Bet Modal */}
      {selectedBet && (
        <BetModal
          isOpen={isBetModalOpen}
          onClose={() => {
            setIsBetModalOpen(false);
            setSelectedBet(null);
          }}
          matchAddress={matchAddress}
          matchAbi={matchAbi}
          betChoice={selectedBet.choice}
          teamName={selectedBet.teamName}
          teamImage={selectedBet.teamImage}
          odds={selectedBet.odds}
          onBetSuccess={fetchMatchData}
        />
      )}

      {/* Bet History Modal (Admin Only) */}
      {isAdmin && (
        <BetHistoryModal
          isOpen={isBetHistoryOpen}
          onClose={() => setIsBetHistoryOpen(false)}
          matchAddress={matchAddress}
          matchAbi={matchAbi}
        />
      )}

      {/* Deposit Liquidity Modal (Admin Only) */}
      {isAdmin && (
        <DepositLiquidityModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          onSubmit={depositLiquidity}
        />
      )}
    </div>
  );
};

export default MatchCard;
