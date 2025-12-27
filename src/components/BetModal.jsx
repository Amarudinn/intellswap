import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';

const BetModal = ({ isOpen, onClose, matchAddress, matchAbi, betChoice, teamName, teamImage, odds, onBetSuccess }) => {
  const [betAmount, setBetAmount] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [maxBet, setMaxBet] = useState(0);

  // Convert IPFS URL to gateway URL
  const getImageUrl = (url) => {
    if (!url) return null;
    
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If IPFS hash, convert to gateway URL
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    
    // If just a hash, add gateway
    if (url.startsWith('Qm') || url.startsWith('bafy')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    
    return url;
  };

  const imageUrl = getImageUrl(teamImage);
  
  console.log('BetModal - Team Image:', { teamImage, imageUrl });

  React.useEffect(() => {
    if (isOpen) {
      fetchMaxBet();
    }
  }, [isOpen]);

  const fetchMaxBet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const matchContract = new ethers.Contract(matchAddress, matchAbi, provider);
      
      const pools = await matchContract.getBettingPools();
      
      // Determine structure based on array length
      let ownerLiquidity, totalBets;
      
      if (pools.length === 3) {
        // MatchNoDraw: (totalBetsA, totalBetsB, ownerLiquidity)
        totalBets = Number(pools[0]) + Number(pools[1]);
        ownerLiquidity = Number(pools[2]);
      } else {
        // MatchWithDraw: (totalBetsHome, totalBetsAway, totalBetsDraw, ownerLiquidity)
        totalBets = Number(pools[0]) + Number(pools[1]) + Number(pools[2]);
        ownerLiquidity = Number(pools[3]);
      }
      
      const totalPool = ownerLiquidity + totalBets;
      
      // Max bet based on pool = total pool / odds (in wei)
      const maxBetFromPool = Math.floor(totalPool / (odds / 100));
      const maxBetFromPoolEth = maxBetFromPool / 1e18;
      
      // Get max bet amount from contract
      let maxBetFromContract = Infinity;
      try {
        const contractMaxBet = await matchContract.getMaxBetAmount();
        maxBetFromContract = Number(contractMaxBet) / 1e18;
        console.log('Contract max bet:', maxBetFromContract, 'MNT');
      } catch (e) {
        console.log('Could not fetch max bet from contract (might be old contract)');
      }
      
      // Take the minimum of pool-based max and contract max
      const effectiveMaxBet = Math.min(maxBetFromPoolEth, maxBetFromContract);
      
      // Add 1% safety margin and round down to 4 decimals
      const safeMaxBet = Math.floor(effectiveMaxBet * 0.99 * 10000) / 10000;
      
      console.log('Max bet calculation:', {
        maxBetFromPool: maxBetFromPoolEth,
        maxBetFromContract,
        effectiveMaxBet,
        safeMaxBet
      });
      
      setMaxBet(safeMaxBet);
    } catch (error) {
      console.error('Error fetching max bet:', error);
    }
  };

  if (!isOpen) return null;

  const calculatePayout = () => {
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) return '0';
    const payout = parseFloat(betAmount) * (odds / 100);
    // Smart decimal: remove unnecessary trailing zeros
    return payout % 1 === 0 ? payout.toString() : payout.toFixed(4).replace(/\.?0+$/, '');
  };

  const handlePlaceBet = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Please enter a valid bet amount',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    // Check if bet amount exceeds max
    if (maxBet > 0 && parseFloat(betAmount) > maxBet) {
      Swal.fire({
        icon: 'warning',
        title: 'Bet Too Large',
        text: `Bet amount exceeds maximum allowed (${maxBet.toFixed(4)} MNT). Please reduce your bet.`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    setIsPlacingBet(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const matchContract = new ethers.Contract(matchAddress, matchAbi, signer);

      const betValue = ethers.parseEther(betAmount);
      const tx = await matchContract.bet(betChoice, { value: betValue });
      
      console.log('Bet transaction sent:', tx.hash);
      await tx.wait();

      await Swal.fire({
        icon: 'success',
        title: 'Bet Placed!',
        html: `
          <div style="text-align: center;">
            <p style="margin: 10px 0;"><strong>Amount:</strong> ${betAmount} MNT</p>
            <p style="margin: 10px 0;"><strong>Potential payout:</strong> ${calculatePayout()} MNT</p>
          </div>
        `,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      setBetAmount('');
      if (onBetSuccess) onBetSuccess(); // Trigger refresh
      onClose();
    } catch (error) {
      console.error('Error placing bet:', error);
      if (error.code === 4001) {
        await Swal.fire({
          icon: 'info',
          title: 'Transaction Cancelled',
          text: 'Transaction rejected by user',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else if (error.message.includes('Insufficient liquidity')) {
        await Swal.fire({
          icon: 'error',
          title: 'Insufficient Liquidity',
          text: 'Insufficient liquidity in the contract. Please try a smaller amount.',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else if (error.message.includes('Betting closed')) {
        await Swal.fire({
          icon: 'error',
          title: 'Betting Closed',
          text: 'Betting is closed for this match',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Bet Failed',
          text: error.message || 'Failed to place bet',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      }
    } finally {
      setIsPlacingBet(false);
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl w-full max-w-md border border-white/10">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-ticket text-[#69d169]"></i>
              <h2 className="text-lg text-white font-bold">Place Bet</h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-2xl transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Team Info */}
            <div className="bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 text-xs font-semibold uppercase tracking-wide">Betting on</span>
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#69d169]/20 rounded-full border border-[#69d169]/40">
                  <i className="fa-solid fa-chart-line text-[#69d169] text-[10px]"></i>
                  <span className="text-[#69d169] font-bold text-xs">
                    {(odds / 100).toFixed(2)}x
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt={teamName}
                      className="w-10 h-10 rounded-xl object-cover border border-[#69d169]/30"
                      onError={(e) => {
                        console.log('Image failed to load:', imageUrl);
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-10 h-10 bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 rounded-xl items-center justify-center border border-[#69d169]/30"
                      style={{ display: 'none' }}
                    >
                      <i className="fa-solid fa-shield-halved text-[#69d169]"></i>
                    </div>
                  </>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 rounded-xl flex items-center justify-center border border-[#69d169]/30">
                    <i className="fa-solid fa-shield-halved text-[#69d169]"></i>
                  </div>
                )}
                <span className="text-white font-bold text-base">{teamName}</span>
              </div>
            </div>

            {/* Bet Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center">
                  <i className="fa-solid fa-coins text-[#69d169] mr-1.5 text-[10px]"></i>
                  Bet Amount
                </label>
                {maxBet > 0 && (
                  <button
                    onClick={() => setBetAmount(maxBet.toFixed(4))}
                    className="text-xs text-[#69d169] hover:brightness-90 font-bold transition-all px-2 py-0.5 bg-[#69d169]/10 rounded-full border border-[#69d169]/30"
                  >
                    MAX: {maxBet.toFixed(4)}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                  max={maxBet}
                  className="w-full bg-black/40 text-white text-xl font-bold p-4 pr-16 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">MNT</span>
              </div>
              {maxBet > 0 && (
                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center">
                  <i className="fa-solid fa-circle-info mr-1"></i>
                  Maximum bet based on current pool and odds
                </p>
              )}
            </div>

            {/* Payout Calculation */}
            <div className="bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-4 space-y-2.5 border border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-semibold">Bet Amount</span>
                <span className="text-white font-bold">{betAmount || '0'} MNT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-semibold">Odds Multiplier</span>
                <span className="text-white font-bold">{(odds / 100).toFixed(2)}x</span>
              </div>
              <div className="border-t border-white/10 pt-2.5 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-bold text-xs uppercase tracking-wide">Potential Payout</span>
                  <div className="flex items-center space-x-1.5">
                    <i className="fa-solid fa-trophy text-[#69d169] text-xs"></i>
                    <span className="text-[#69d169] font-black text-lg">{calculatePayout()}</span>
                    <span className="text-gray-400 text-xs">MNT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 rounded-xl p-3">
              <div className="flex items-start space-x-2">
                <i className="fa-solid fa-lightbulb text-yellow-400 mt-0.5 text-xs"></i>
                <p className="text-[10px] text-gray-300 leading-relaxed">
                  Your bet will be locked until the match ends. If you win, you can claim your payout after the match is finalized.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gradient-to-br from-black/60 to-black/40 text-gray-300 rounded-xl hover:brightness-90 transition-all font-bold text-sm border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceBet}
                disabled={isPlacingBet || !betAmount || parseFloat(betAmount) <= 0}
                className="flex-1 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] py-3 px-4 rounded-xl transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlacingBet ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Placing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check-circle mr-2"></i>
                    Confirm Bet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default BetModal;
