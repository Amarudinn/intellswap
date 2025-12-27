import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Web3Provider, useWeb3 } from '../context/Web3Context';
import { config, rainbowTheme } from '../config/wagmi';
import Navbar from '../components/Navbar';
import GridScan from '../components/GridScan';
import StakingPoolSelector from '../components/StakingPoolSelector';
import Swal from 'sweetalert2';
import { stakingPools, nativeStakingAbi, tokenStakingAbi, erc20Abi } from '../config/stakingConfig';
import { formatBalance, formatAPY } from '../utils/formatNumber';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const StakingContent = () => {
  const { account } = useWeb3();
  const [activeTab, setActiveTab] = useState('stake');
  const [selectedPool, setSelectedPool] = useState(stakingPools[0]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [stakeInfo, setStakeInfo] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [apy, setApy] = useState('0');
  const [showPoolSelector, setShowPoolSelector] = useState(false);
  const [bonusPoolInfo, setBonusPoolInfo] = useState({ totalBonusPool: '0' });

  useEffect(() => {
    if (account && selectedPool) {
      fetchStakeInfo();
      fetchTokenBalance();
      fetchAPY();
      fetchBonusPoolInfo();
    }
  }, [account, selectedPool]);

  const getStakingAbi = () => {
    return selectedPool.type === 'native' ? nativeStakingAbi : tokenStakingAbi;
  };

  const fetchStakeInfo = async () => {
    if (!account || !selectedPool.contractAddress || selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      setStakeInfo({ amount: '0', pendingRewards: '0', pendingBonus: '0', unlockTime: 0, totalClaimed: '0', totalBonusClaimed: '0' });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), provider);
      const info = await contract.getStakeInfo(account);
      
      setStakeInfo({
        amount: ethers.formatEther(info[0]),
        startTime: Number(info[1]),
        lastClaimTime: Number(info[2]),
        totalClaimed: ethers.formatEther(info[3]),
        pendingRewards: ethers.formatEther(info[4]),
        unlockTime: Number(info[5]),
        pendingBonus: ethers.formatEther(info[6]),
        totalBonusClaimed: ethers.formatEther(info[7])
      });
    } catch (error) {
      console.error('Error fetching stake info:', error);
      setStakeInfo({ amount: '0', pendingRewards: '0', pendingBonus: '0', unlockTime: 0, totalClaimed: '0', totalBonusClaimed: '0' });
    }
  };

  const fetchBonusPoolInfo = async () => {
    if (!selectedPool.contractAddress || selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      setBonusPoolInfo({ totalBonusPool: '0' });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), provider);
      const info = await contract.getBonusPoolInfo();
      setBonusPoolInfo({
        totalBonusPool: ethers.formatEther(info[0]),
        accBonusPerShare: info[1].toString()
      });
    } catch (error) {
      console.error('Error fetching bonus pool info:', error);
      setBonusPoolInfo({ totalBonusPool: '0' });
    }
  };

  const fetchTokenBalance = async () => {
    if (!account) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      if (selectedPool.type === 'native') {
        const balance = await provider.getBalance(account);
        setTokenBalance(ethers.formatEther(balance));
      } else {
        const tokenContract = new ethers.Contract(selectedPool.stakingToken.address, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(account);
        setTokenBalance(ethers.formatEther(balance));
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  };

  const fetchAPY = async () => {
    if (!selectedPool.contractAddress || selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      setApy(selectedPool.apy.toString());
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), provider);
      const apyValue = await contract.getAPY();
      setApy(Number(apyValue).toFixed(2));
    } catch (error) {
      console.error('Error fetching APY:', error);
      setApy(selectedPool.apy.toString());
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid stake amount', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    if (parseFloat(stakeAmount) < selectedPool.minimumStake) {
      Swal.fire({ icon: 'warning', title: 'Amount Too Low', text: `Minimum stake is ${selectedPool.minimumStake} ${selectedPool.stakingToken.symbol}`, background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    if (selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      Swal.fire({ icon: 'info', title: 'Coming Soon', text: 'Staking contract is not deployed yet', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), signer);
      const amount = ethers.parseEther(stakeAmount);

      if (selectedPool.type === 'native') {
        const tx = await stakingContract.stake({ value: amount });
        await tx.wait();
      } else {
        const tokenContract = new ethers.Contract(selectedPool.stakingToken.address, erc20Abi, signer);
        const allowance = await tokenContract.allowance(account, selectedPool.contractAddress);
        
        if (allowance < amount) {
          const approveTx = await tokenContract.approve(selectedPool.contractAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        const tx = await stakingContract.stake(amount);
        await tx.wait();
      }

      await Swal.fire({ icon: 'success', title: 'Staked Successfully!', text: `You have staked ${stakeAmount} ${selectedPool.stakingToken.symbol}`, background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169', iconColor: '#69d169' });
      setStakeAmount('');
      fetchStakeInfo();
      fetchTokenBalance();
      fetchBonusPoolInfo();
    } catch (error) {
      console.error('Error staking:', error);
      Swal.fire({ icon: 'error', title: 'Staking Failed', text: error.message || 'Failed to stake tokens', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid unstake amount', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    if (selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      Swal.fire({ icon: 'info', title: 'Coming Soon', text: 'Staking contract is not deployed yet', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), signer);
      const amount = ethers.parseEther(unstakeAmount);
      const tx = await stakingContract.unstake(amount);
      await tx.wait();

      await Swal.fire({ icon: 'success', title: 'Unstaked Successfully!', text: `You have unstaked ${unstakeAmount} ${selectedPool.stakingToken.symbol}`, background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169', iconColor: '#69d169' });
      setUnstakeAmount('');
      fetchStakeInfo();
      fetchTokenBalance();
      fetchBonusPoolInfo();
    } catch (error) {
      console.error('Error unstaking:', error);
      Swal.fire({ icon: 'error', title: 'Unstaking Failed', text: error.message || 'Failed to unstake tokens', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    const totalRewards = parseFloat(stakeInfo?.pendingRewards || 0) + parseFloat(stakeInfo?.pendingBonus || 0);
    if (!stakeInfo || totalRewards <= 0) {
      Swal.fire({ icon: 'info', title: 'No Rewards', text: 'You have no pending rewards to claim', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    if (selectedPool.contractAddress === '0x0000000000000000000000000000000000000000') {
      Swal.fire({ icon: 'info', title: 'Coming Soon', text: 'Staking contract is not deployed yet', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(selectedPool.contractAddress, getStakingAbi(), signer);
      const tx = await stakingContract.claimRewards();
      await tx.wait();

      const apyReward = formatBalance(stakeInfo.pendingRewards);
      const bonusReward = formatBalance(stakeInfo.pendingBonus);
      
      await Swal.fire({ 
        icon: 'success', 
        title: 'Rewards Claimed!', 
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="margin: 5px 0;"><strong>APY Rewards:</strong> ${apyReward} ${selectedPool.rewardToken.symbol}</p>
            <p style="margin: 5px 0;"><strong>Bonus Revenue:</strong> ${bonusReward} ${selectedPool.rewardToken.symbol}</p>
            <hr style="border-color: #333; margin: 10px 0;">
            <p style="margin: 5px 0;"><strong>Total:</strong> ${formatBalance(totalRewards.toString())} ${selectedPool.rewardToken.symbol}</p>
          </div>
        `,
        background: '#1a1a1a', 
        color: '#fff', 
        confirmButtonColor: '#69d169', 
        iconColor: '#69d169' 
      });
      fetchStakeInfo();
      fetchBonusPoolInfo();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      Swal.fire({ icon: 'error', title: 'Claim Failed', text: error.message || 'Failed to claim rewards', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#69d169' });
    } finally {
      setLoading(false);
    }
  };

  const totalClaimable = parseFloat(stakeInfo?.pendingRewards || 0) + parseFloat(stakeInfo?.pendingBonus || 0);

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 pb-24 md:pb-10 px-4">
        <div className="container mx-auto max-w-4xl">

          {!account ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-[#69d169]/30">
                <i className="fa-solid fa-wallet text-5xl text-[#69d169]"></i>
              </div>
              <h2 className="text-2xl font-bold text-[#69d169] mb-3">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-2 max-w-md mx-auto">Please connect your wallet to start staking</p>
              <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                <i className="fa-solid fa-arrow-up"></i>
                Use the "Connect Wallet" button in the navigation bar above
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pool Selector */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Select Staking Pool</label>
                <div className="relative">
                  <button
                    onClick={() => setShowPoolSelector(!showPoolSelector)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-black/40 border border-white/10 rounded-xl hover:border-[#69d169]/40 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={selectedPool.stakingToken.logoURI} alt={selectedPool.stakingToken.symbol} className="w-8 h-8 rounded-full" />
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-semibold text-sm">{selectedPool.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            selectedPool.type === 'native' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {selectedPool.type === 'native' ? 'Native' : 'ERC20'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">APY: <span className="text-[#69d169]">{selectedPool.apy}%</span></span>
                          {selectedPool.revenueShare > 0 && (
                            <span className="text-xs text-yellow-400">+{selectedPool.revenueShare}% Revenue</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform ${showPoolSelector ? 'rotate-180' : ''}`}></i>
                  </button>
                  
                  <StakingPoolSelector
                    pools={stakingPools}
                    selectedPool={selectedPool}
                    onSelectPool={setSelectedPool}
                    isOpen={showPoolSelector}
                    onClose={() => setShowPoolSelector(false)}
                  />
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total Staked</span>
                    <i className="fa-solid fa-lock text-[#69d169]"></i>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stakeInfo ? formatBalance(stakeInfo.amount) : '0'} {selectedPool.stakingToken.symbol}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">≈ $0.00</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">APY Rewards</span>
                    <i className="fa-solid fa-percent text-[#69d169]"></i>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stakeInfo ? formatBalance(stakeInfo.pendingRewards) : '0'} {selectedPool.rewardToken.symbol}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">From staking APY</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Bonus Revenue</span>
                    <i className="fa-solid fa-gift text-yellow-400"></i>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stakeInfo ? formatBalance(stakeInfo.pendingBonus) : '0'} {selectedPool.rewardToken.symbol}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">From betting profits ({selectedPool.revenueShare || 0}%)</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">APY</span>
                    <i className="fa-solid fa-chart-line text-[#69d169]"></i>
                  </div>
                  <p className="text-2xl font-bold text-[#69d169]">{formatAPY(apy)}%</p>
                </div>
              </div>

              {/* Main Staking Card */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-6 border border-white/10">
                <div className="flex bg-black/30 p-1 rounded-full mb-6">
                  <button onClick={() => setActiveTab('stake')} className={`rounded-full flex-1 py-2.5 font-semibold focus:outline-none transition-all ${activeTab === 'stake' ? 'bg-[#69d169] text-[#0a0a0a]' : 'text-gray-400 hover:text-gray-300'}`}>Stake</button>
                  <button onClick={() => setActiveTab('unstake')} className={`rounded-full flex-1 py-2.5 font-semibold focus:outline-none transition-all ${activeTab === 'unstake' ? 'bg-[#69d169] text-[#0a0a0a]' : 'text-gray-400 hover:text-gray-300'}`}>Unstake</button>
                </div>

                {activeTab === 'stake' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-300">Amount to Stake</label>
                        <span className="text-xs text-gray-500">Balance: {formatBalance(tokenBalance)} {selectedPool.stakingToken.symbol}</span>
                      </div>
                      <div className="relative">
                        <input type="number" placeholder="0.0" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full bg-black/40 text-white text-xl font-bold p-4 pr-20 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all" />
                        <button onClick={() => setStakeAmount(formatBalance(tokenBalance))} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#69d169]/20 hover:bg-[#69d169]/30 text-[#69d169] text-xs font-bold rounded-lg transition-all">MAX</button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-[#69d169]/10 to-[#69d169]/5 border border-[#69d169]/30 rounded-xl p-4">
                      <div className="flex items-start space-x-2">
                        <i className="fa-solid fa-info-circle text-[#69d169] mt-0.5"></i>
                        <div className="text-xs text-gray-300 space-y-1">
                          <p>• Minimum stake: {selectedPool.minimumStake} {selectedPool.stakingToken.symbol}</p>
                          <p>• No lock period - unstake anytime</p>
                          <p>• Type: {selectedPool.type === 'native' ? 'Native Coin' : 'ERC20 Token'}</p>
                          {selectedPool.revenueShare > 0 && (
                            <p className="text-yellow-400">• Earn {selectedPool.revenueShare}% of betting profits as bonus!</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button onClick={handleStake} disabled={loading} className="w-full bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-[#0a0a0a] font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? (<><i className="fa-solid fa-spinner fa-spin mr-2"></i>Processing...</>) : (<><i className="fa-solid fa-lock mr-2"></i>Stake {selectedPool.stakingToken.symbol}</>)}
                    </button>
                  </div>
                )}

                {activeTab === 'unstake' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-300">Amount to Unstake</label>
                        <span className="text-xs text-gray-500">Staked: {stakeInfo ? formatBalance(stakeInfo.amount) : '0'} {selectedPool.stakingToken.symbol}</span>
                      </div>
                      <div className="relative">
                        <input type="number" placeholder="0.0" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} className="w-full bg-black/40 text-white text-xl font-bold p-4 pr-20 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all" />
                        <button onClick={() => setUnstakeAmount(formatBalance(stakeInfo?.amount || '0'))} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#69d169]/20 hover:bg-[#69d169]/30 text-[#69d169] text-xs font-bold rounded-lg transition-all">MAX</button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-start space-x-2">
                        <i className="fa-solid fa-info-circle text-blue-400 mt-0.5"></i>
                        <div className="text-xs text-gray-300 space-y-1">
                          <p>• You can unstake anytime without claiming rewards</p>
                          <p>• Your pending rewards will remain claimable after unstaking</p>
                          <p>• Claim your rewards separately using the Claim button</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleUnstake} 
                      disabled={loading} 
                      className={`w-full font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        unstakeAmount && parseFloat(unstakeAmount) > 0
                          ? 'bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-[#0a0a0a]'
                          : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:brightness-110 text-white'
                      }`}
                    >
                      {loading ? (<><i className="fa-solid fa-spinner fa-spin mr-2"></i>Processing...</>) : (<><i className="fa-solid fa-unlock mr-2"></i>Unstake {selectedPool.stakingToken.symbol}</>)}
                    </button>
                  </div>
                )}
              </div>

              {/* Claim Rewards Card - Updated with separate display */}
              <div className="bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/5 rounded-2xl p-6 border border-[#69d169]/30">
                <h3 className="text-lg font-bold text-white mb-4">Claim Rewards</h3>
                
                {/* Rewards Breakdown */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <i className="fa-solid fa-percent text-[#69d169]"></i>
                      <span className="text-gray-300 text-sm">APY Rewards</span>
                    </div>
                    <span className="text-white font-bold">{stakeInfo ? formatBalance(stakeInfo.pendingRewards) : '0'} {selectedPool.rewardToken.symbol}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <i className="fa-solid fa-gift text-yellow-400"></i>
                      <span className="text-gray-300 text-sm">Bonus Revenue</span>
                    </div>
                    <span className="text-yellow-400 font-bold">{stakeInfo ? formatBalance(stakeInfo.pendingBonus) : '0'} {selectedPool.rewardToken.symbol}</span>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">Total Claimable</span>
                      <span className="text-2xl font-black text-[#69d169]">{formatBalance(totalClaimable.toString())} {selectedPool.rewardToken.symbol}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">≈ $0.00</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleClaimRewards} 
                  disabled={loading || totalClaimable <= 0} 
                  className="w-full px-6 py-3 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-[#0a0a0a] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (<><i className="fa-solid fa-spinner fa-spin mr-2"></i>Claiming...</>) : (<><i className="fa-solid fa-gift mr-2"></i>Claim All Rewards</>)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const StakingPage = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme(rainbowTheme)}>
          <Web3Provider>
            <div className="min-h-screen" style={{ position: 'relative' }}>
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
                <GridScan sensitivity={0.55} lineThickness={1} linesColor="#69d169" gridScale={0.08} scanColor="#69d169" scanOpacity={0.6} />
              </div>
              <StakingContent />
            </div>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default StakingPage;
