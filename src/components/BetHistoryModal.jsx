import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';

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
const BetItem = ({ bet, teamNames, teamImages, formatAmount }) => {
  const [imageError, setImageError] = useState(false);
  
  const getChoiceName = (choice) => {
    if (choice === 1) return teamNames.team1 || 'Team A';
    if (choice === 2) return teamNames.team2 || 'Team B';
    if (choice === 3) return 'Draw';
    return 'Unknown';
  };

  const getTeamImage = (choice) => {
    if (choice === 1) return convertIpfsUrl(teamImages.team1);
    if (choice === 2) return convertIpfsUrl(teamImages.team2);
    return '';
  };

  const teamImage = getTeamImage(bet.choice);

  return (
    <div className="bg-gradient-to-r from-black/60 to-black/40 rounded-xl p-3 border border-white/5 hover:border-[#69d169]/30 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-9 h-9 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-lg flex items-center justify-center border border-[#69d169]/20 group-hover:border-[#69d169]/40 transition-all flex-shrink-0">
            <i className="fa-solid fa-user text-[#69d169] text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={`https://sepolia.mantlescan.xyz/address/${bet.user}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-[#69d169] font-mono transition-colors flex items-center space-x-1"
            >
              <i className="fa-solid fa-link text-[9px]"></i>
              <span>{bet.user.slice(0, 6)}...{bet.user.slice(-4)}</span>
            </a>
            <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
              <i className="fa-solid fa-cube text-[9px] mr-1"></i>
              Block #{bet.blockNumber}
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="flex items-center justify-end space-x-1.5 mb-1">
            <i className="fa-solid fa-coins text-[#69d169] text-xs"></i>
            <span className="text-sm font-bold text-white">
              {formatAmount(bet.amount)}
            </span>
            <span className="text-xs text-gray-400">MNT</span>
          </div>
          <div className="inline-flex items-center px-2 py-0.5 bg-[#69d169]/10 rounded-full border border-[#69d169]/30">
            <div className="w-4 h-4 rounded flex items-center justify-center mr-1.5 overflow-hidden bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20">
              {teamImage && !imageError ? (
                <img 
                  src={teamImage} 
                  alt={getChoiceName(bet.choice)}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <i className="fa-solid fa-shield-halved text-[#69d169] text-[8px]"></i>
              )}
            </div>
            <span className="text-[10px] text-[#69d169] font-bold">
              {getChoiceName(bet.choice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BetHistoryModal = ({ isOpen, onClose, matchAddress, matchAbi }) => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamNames, setTeamNames] = useState({ team1: '', team2: '' });
  const [teamImages, setTeamImages] = useState({ team1: '', team2: '' });

  // Smart decimal formatter
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return num % 1 === 0 ? num.toString() : num.toFixed(4).replace(/\.?0+$/, '');
  };

  useEffect(() => {
    if (isOpen) {
      fetchBetHistory();
    }
  }, [isOpen]);

  const fetchBetHistory = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const matchContract = new ethers.Contract(matchAddress, matchAbi, provider);

      // Fetch team names and images
      try {
        const info = await matchContract.getMatchInfo();
        setTeamNames({ team1: info[0], team2: info[1] });
        
        const images = await matchContract.getTeamImages();
        setTeamImages({ team1: images[0] || '', team2: images[1] || '' });
      } catch (e) {
        console.log('Could not fetch team info/images');
      }

      // Get current block
      const currentBlock = await provider.getBlockNumber();
      
      // Limit to last 10000 blocks to avoid RPC limits
      const fromBlock = Math.max(0, currentBlock - 10000);

      // Get BetPlaced events with block range limit
      const filter = matchContract.filters.BetPlaced();
      const events = await matchContract.queryFilter(filter, fromBlock, 'latest');

      const betList = events.map(event => ({
        user: event.args.user,
        choice: Number(event.args.choice),
        amount: ethers.formatEther(event.args.amount),
        blockNumber: event.blockNumber
      }));

      // Sort by block number (newest first)
      betList.sort((a, b) => b.blockNumber - a.blockNumber);

      setBets(betList);
    } catch (error) {
      console.error('Error fetching bet history:', error);
      // Set empty array on error so UI shows "No bets" instead of loading forever
      setBets([]);
    }
    setLoading(false);
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
              <i className="fa-solid fa-clock-rotate-left text-[#69d169]"></i>
              <h2 className="text-lg text-white font-bold">Bet History</h2>
              {bets.length > 0 && (
                <span className="px-2 py-0.5 bg-[#69d169]/20 text-[#69d169] text-xs font-bold rounded-full border border-[#69d169]/30">
                  {bets.length}
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
            {loading ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-[#69d169] mb-3"></i>
                <p className="text-gray-400 font-semibold">Loading bet history...</p>
              </div>
            ) : bets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-700/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-inbox text-3xl text-gray-600"></i>
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-2">No Bets Yet</p>
                <p className="text-sm text-gray-500">
                  Bet history will appear here once users place bets
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bets.map((bet, index) => (
                  <BetItem 
                    key={index}
                    bet={bet}
                    teamNames={teamNames}
                    teamImages={teamImages}
                    formatAmount={formatAmount}
                  />
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

export default BetHistoryModal;
