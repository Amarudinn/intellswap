import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import axios from 'axios';
import Swal from 'sweetalert2';

const CreateMatchModal = ({ isOpen, onClose, factoryAddress, factoryAbi }) => {
  const { signer } = useWeb3();
  const [matchType, setMatchType] = useState('withDraw'); // 'withDraw' or 'noDraw'
  const [isCreating, setIsCreating] = useState(false);
  const [minDateTime, setMinDateTime] = useState('');
  
  // Image upload state
  const [teamAImage, setTeamAImage] = useState(null);
  const [teamBImage, setTeamBImage] = useState(null);
  const [teamAImagePreview, setTeamAImagePreview] = useState('');
  const [teamBImagePreview, setTeamBImagePreview] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    league: '',
    teamA: '',
    teamB: '',
    matchDate: '',
    matchTime: '',
    matchDateTime: '',
    oddsA: '',
    oddsB: '',
    oddsDraw: '',
    maxBet: '10' // Default 10 MNT
  });

  // Fetch blockchain time when modal opens
  React.useEffect(() => {
    if (isOpen && signer) {
      fetchBlockchainTime();
    }
  }, [isOpen, signer]);

  const fetchBlockchainTime = async () => {
    try {
      const provider = signer.provider;
      const latestBlock = await provider.getBlock('latest');
      const blockchainTime = latestBlock.timestamp;
      
      // Allow up to 7 days in the past (matching contract validation)
      const minTime = new Date((blockchainTime - (7 * 24 * 60 * 60)) * 1000);
      
      // Format for datetime-local input: YYYY-MM-DDTHH:mm
      const year = minTime.getFullYear();
      const month = String(minTime.getMonth() + 1).padStart(2, '0');
      const day = String(minTime.getDate()).padStart(2, '0');
      const hours = String(minTime.getHours()).padStart(2, '0');
      const minutes = String(minTime.getMinutes()).padStart(2, '0');
      
      const minDateTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
      setMinDateTime(minDateTimeStr);
      
    } catch (error) {
      console.error('Error fetching blockchain time:', error);
    }
  };

  const handleImageSelect = (team, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please select an image file',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Image size must be less than 5MB',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    // Set file and preview
    if (team === 'A') {
      setTeamAImage(file);
      setTeamAImagePreview(URL.createObjectURL(file));
    } else {
      setTeamBImage(file);
      setTeamBImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadToPinata = async (file) => {
    const JWT = import.meta.env.VITE_PINATA_JWT;
    
    if (!JWT) {
      throw new Error('Pinata JWT not configured. Please add VITE_PINATA_JWT to .env file');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${JWT}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return `ipfs://${response.data.IpfsHash}`;
  };

  const uploadImages = async () => {
    const images = { teamA: '', teamB: '' };

    if (teamAImage) {
      setIsUploadingImages(true);
      try {
        images.teamA = await uploadToPinata(teamAImage);
        console.log('Team A image uploaded:', images.teamA);
      } catch (error) {
        console.error('Error uploading team A image:', error);
        throw new Error(`Failed to upload Team A image: ${error.message}`);
      }
    }

    if (teamBImage) {
      try {
        images.teamB = await uploadToPinata(teamBImage);
        console.log('Team B image uploaded:', images.teamB);
      } catch (error) {
        console.error('Error uploading team B image:', error);
        throw new Error(`Failed to upload Team B image: ${error.message}`);
      } finally {
        setIsUploadingImages(false);
      }
    }

    return images;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateMatch = async () => {
    if (!signer) {
      Swal.fire({
        icon: 'warning',
        title: 'Wallet Not Connected',
        text: 'Please connect wallet first',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    // Validation
    if (!formData.league || !formData.teamA || !formData.teamB || !formData.matchDate || !formData.matchTime) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please fill all required fields',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    if (!formData.oddsA || !formData.oddsB) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Odds',
        text: 'Please set odds for both teams',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    if (matchType === 'withDraw' && !formData.oddsDraw) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Draw Odds',
        text: 'Please set odds for draw',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Get blockchain's current time
      const provider = signer.provider;
      const latestBlock = await provider.getBlock('latest');
      const blockchainTime = latestBlock.timestamp;
      
      // Convert date and time to Unix timestamp
      // Browser automatically handles local timezone to UTC conversion
      const dateTimeString = `${formData.matchDate}T${formData.matchTime}:00`;
      const matchDateTime = new Date(dateTimeString);
      const unixTimestamp = Math.floor(matchDateTime.getTime() / 1000);
      
      console.log('=== TIMEZONE INFO ===');
      console.log('Your local time:', matchDateTime.toLocaleString());
      console.log('UTC time:', matchDateTime.toUTCString());
      console.log('Unix timestamp:', unixTimestamp);

      // Allow up to 7 days in the past (matching contract validation)
      const minValidTime = blockchainTime - (7 * 24 * 60 * 60);

      console.log('=== TIMESTAMP DEBUG ===');
      console.log('Blockchain time:', blockchainTime, '→', new Date(blockchainTime * 1000).toLocaleString());
      console.log('Match timestamp:', unixTimestamp, '→', matchDateTime.toLocaleString());
      console.log('Difference (seconds):', unixTimestamp - blockchainTime);
      console.log('Min allowed (7 days back):', minValidTime, '→', new Date(minValidTime * 1000).toLocaleString());

      // Check if timestamp is within valid range (not more than 7 days in the past)
      if (unixTimestamp <= minValidTime) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Match Time',
          html: `
            <p style="margin-bottom: 10px;">Match time is too far in the past.</p>
            <div style="text-align: left; margin-top: 15px; padding: 15px; background: rgba(220, 53, 69, 0.1); border-radius: 8px; border: 1px solid rgba(220, 53, 69, 0.3);">
              <p style="margin: 5px 0; font-size: 13px;"><strong>Blockchain time:</strong><br>${new Date(blockchainTime * 1000).toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Selected time:</strong><br>${matchDateTime.toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Minimum allowed:</strong><br>${new Date(minValidTime * 1000).toLocaleString()}</p>
            </div>
            <p style="margin-top: 15px; font-size: 13px; color: #888;">Please select a time within 7 days of blockchain time.</p>
          `,
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
        setIsCreating(false);
        return;
      }

      // Convert odds to contract format (e.g., 1.8 -> 180)
      const oddsAFormatted = Math.floor(parseFloat(formData.oddsA) * 100);
      const oddsBFormatted = Math.floor(parseFloat(formData.oddsB) * 100);

      const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, signer);

      let tx;
      if (matchType === 'withDraw') {
        const oddsDrawFormatted = Math.floor(parseFloat(formData.oddsDraw) * 100);
        
        tx = await factoryContract.createMatchWithDraw(
          formData.league,
          formData.teamA,
          formData.teamB,
          unixTimestamp,
          oddsAFormatted,
          oddsBFormatted,
          oddsDrawFormatted
        );
      } else {
        tx = await factoryContract.createMatchNoDraw(
          formData.league,
          formData.teamA,
          formData.teamB,
          unixTimestamp,
          oddsAFormatted,
          oddsBFormatted
        );
      }

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      // Get match address from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = factoryContract.interface.parseLog(log);
          return parsed && (parsed.name === 'MatchWithDrawCreated' || parsed.name === 'MatchNoDrawCreated');
        } catch {
          return false;
        }
      });

      let matchAddress = null;
      if (event) {
        const parsed = factoryContract.interface.parseLog(event);
        matchAddress = parsed.args.matchAddress || parsed.args[0];
        console.log('Match created at address:', matchAddress);
      }

      // Set max bet and upload images if provided
      if (matchAddress) {
        try {
          // Get match contract ABI
          const matchAbi = matchType === 'withDraw' 
            ? (await import('../config/sportsBettingAbi.js')).matchWithDrawAbi
            : (await import('../config/sportsBettingAbi.js')).matchNoDrawAbi;
          
          const matchContract = new ethers.Contract(matchAddress, matchAbi, signer);

          // Set max bet amount if different from default (10 MNT)
          if (formData.maxBet && parseFloat(formData.maxBet) !== 10) {
            const maxBetWei = ethers.parseEther(formData.maxBet);
            const maxBetTx = await matchContract.setMaxBetAmount(maxBetWei);
            await maxBetTx.wait();
            console.log('Max bet amount set to:', formData.maxBet, 'MNT');
          }

          // Upload and set images if provided
          if (teamAImage || teamBImage) {
            Swal.fire({
              icon: 'info',
              title: 'Uploading Images',
              text: 'Match created! Now uploading images...',
              background: '#1a1a1a',
              color: '#fff',
              showConfirmButton: false,
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            const images = await uploadImages();
            
            if (images.teamA || images.teamB) {
              const imageTx = await matchContract.setTeamImages(
                images.teamA || '',
                images.teamB || ''
              );
              await imageTx.wait();
              console.log('Images set successfully');
            }
          }
        } catch (error) {
          console.error('Error setting match properties:', error);
          Swal.fire({
            icon: 'warning',
            title: 'Partial Success',
            html: `Match created but failed to set properties:<br><br><strong>${error.message}</strong><br><br>You can update them later from the match card.`,
            background: '#1a1a1a',
            color: '#fff',
            confirmButtonColor: '#69d169',
          });
        }
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Match Created!',
        text: 'Your match has been created successfully.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      
      // Reset form
      setFormData({
        league: '',
        teamA: '',
        teamB: '',
        matchDate: '',
        matchTime: '',
        matchDateTime: '',
        oddsA: '',
        oddsB: '',
        oddsDraw: '',
        maxBet: '10'
      });
      setTeamAImage(null);
      setTeamBImage(null);
      setTeamAImagePreview('');
      setTeamBImagePreview('');
      
      onClose();
    } catch (error) {
      console.error('Error creating match:', error);
      if (error.code === 4001) {
        Swal.fire({
          icon: 'info',
          title: 'Transaction Cancelled',
          text: 'Transaction rejected by user',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Creation Failed',
          text: error.message || 'Failed to create match',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#69d169',
        });
      }
    } finally {
      setIsCreating(false);
    }
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
        <div className="bg-[#141414] rounded-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#141414] z-10">
            <h2 className="text-2xl text-white font-bold">Create New Match</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-3xl transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Match Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Match Type
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMatchType('withDraw')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    matchType === 'withDraw'
                      ? 'bg-[#69d169] text-[#1c1c1c]'
                      : 'bg-black/40 text-gray-400 hover:bg-black/60'
                  }`}
                >
                  <i className="fa-solid fa-futbol mr-2"></i>
                  With Draw (Football, Hockey)
                </button>
                <button
                  onClick={() => setMatchType('noDraw')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    matchType === 'noDraw'
                      ? 'bg-[#69d169] text-[#1c1c1c]'
                      : 'bg-black/40 text-gray-400 hover:bg-black/60'
                  }`}
                >
                  <i className="fa-solid fa-basketball mr-2"></i>
                  No Draw (Basketball, Tennis)
                </button>
              </div>
            </div>

            {/* League */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                League / Competition *
              </label>
              <input
                type="text"
                name="league"
                value={formData.league}
                onChange={handleChange}
                placeholder="e.g., Spain - LaLiga, NBA, Premier League"
                className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
              />
            </div>

            {/* Team Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {matchType === 'withDraw' ? 'Home Team' : 'Team A'} *
                </label>
                <input
                  type="text"
                  name="teamA"
                  value={formData.teamA}
                  onChange={handleChange}
                  placeholder="e.g., Barcelona"
                  className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {matchType === 'withDraw' ? 'Away Team' : 'Team B'} *
                </label>
                <input
                  type="text"
                  name="teamB"
                  value={formData.teamB}
                  onChange={handleChange}
                  placeholder="e.g., Real Madrid"
                  className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
                />
              </div>
            </div>

            {/* Team Images (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {matchType === 'withDraw' ? 'Home Team' : 'Team A'} Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect('A', e)}
                  className="hidden"
                  id="teamAImage"
                />
                <label
                  htmlFor="teamAImage"
                  className="w-full bg-black/40 text-gray-400 p-3 border border-white/10 rounded-lg hover:border-[#69d169]/40 transition-all cursor-pointer flex items-center justify-center"
                >
                  {teamAImagePreview ? (
                    <img src={teamAImagePreview} alt="Team A" className="h-16 w-16 object-cover rounded" />
                  ) : (
                    <div className="text-center">
                      <i className="fa-solid fa-image text-2xl mb-1"></i>
                      <p className="text-xs">Click to upload</p>
                    </div>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {matchType === 'withDraw' ? 'Away Team' : 'Team B'} Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect('B', e)}
                  className="hidden"
                  id="teamBImage"
                />
                <label
                  htmlFor="teamBImage"
                  className="w-full bg-black/40 text-gray-400 p-3 border border-white/10 rounded-lg hover:border-[#69d169]/40 transition-all cursor-pointer flex items-center justify-center"
                >
                  {teamBImagePreview ? (
                    <img src={teamBImagePreview} alt="Team B" className="h-16 w-16 object-cover rounded" />
                  ) : (
                    <div className="text-center">
                      <i className="fa-solid fa-image text-2xl mb-1"></i>
                      <p className="text-xs">Click to upload</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Match Date & Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Match Date & Time *
              </label>
              <input
                type="datetime-local"
                name="matchDateTime"
                value={formData.matchDateTime || ''}
                onChange={(e) => {
                  const dateTime = new Date(e.target.value);
                  setFormData({
                    ...formData,
                    matchDateTime: e.target.value,
                    matchDate: e.target.value.split('T')[0],
                    matchTime: e.target.value.split('T')[1]
                  });
                }}
                min={minDateTime}
                className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
              />
              {minDateTime && (
                <p className="text-xs text-gray-500 mt-2">
                  <i className="fa-solid fa-clock mr-1"></i>
                  Minimum time based on blockchain: {new Date(minDateTime).toLocaleString()}
                </p>
              )}
            </div>

            {/* Odds */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Odds (Multiplier)
              </label>
              <div className={`grid ${matchType === 'withDraw' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    {matchType === 'withDraw' ? 'Home' : 'Team A'} *
                  </label>
                  <input
                    type="number"
                    name="oddsA"
                    value={formData.oddsA}
                    onChange={handleChange}
                    placeholder="1.8"
                    step="0.01"
                    min="1.00"
                    className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    {matchType === 'withDraw' ? 'Away' : 'Team B'} *
                  </label>
                  <input
                    type="number"
                    name="oddsB"
                    value={formData.oddsB}
                    onChange={handleChange}
                    placeholder="2.2"
                    step="0.01"
                    min="1.00"
                    className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
                  />
                </div>
                {matchType === 'withDraw' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Draw *
                    </label>
                    <input
                      type="number"
                      name="oddsDraw"
                      value={formData.oddsDraw}
                      onChange={handleChange}
                      placeholder="3.5"
                      step="0.01"
                      min="1.00"
                      className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Example: 1.8 means if user bets 10 MNT, they win 18 MNT (profit: 8 MNT)
              </p>
            </div>

            {/* Max Bet Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Maximum Bet Amount (MNT)
              </label>
              <input
                type="number"
                name="maxBet"
                value={formData.maxBet}
                onChange={handleChange}
                placeholder="10"
                step="0.1"
                min="0.1"
                className="w-full bg-black/40 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Maximum amount a user can bet per transaction (default: 10 MNT)
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-[#69d169]/10 border border-[#69d169]/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <i className="fa-solid fa-info-circle text-[#69d169] mt-1"></i>
                <div className="text-sm text-gray-300">
                  <p className="font-semibold text-white mb-1">Important:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Betting will close 10 minutes before match starts</li>
                    <li>You must deposit liquidity to the match contract after creation</li>
                    <li>Users can only bet if contract has sufficient liquidity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-black/40 text-gray-300 rounded-lg hover:bg-black/60 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMatch}
                disabled={isCreating || !signer}
                className="flex-1 btn btn-primary py-3 px-4 font-semibold"
              >
                {isCreating ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus mr-2"></i>
                    Create Match
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

export default CreateMatchModal;
