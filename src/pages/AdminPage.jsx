import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Web3Provider, useWeb3 } from '../context/Web3Context';
import { FactoryProvider, useFactory } from '../context/FactoryContext';
import { config, rainbowTheme } from '../config/wagmi';
import CreateMatchModal from '../components/CreateMatchModal';
import CreateFactoryModal from '../components/CreateFactoryModal';
import MatchCard from '../components/MatchCard';
import FactorySelector from '../components/FactorySelector';
import { factoryAbi, sportsBettingAddresses, matchWithDrawAbi, matchNoDrawAbi } from '../config/sportsBettingAbi';
import Navbar from '../components/Navbar';
import GridScan from '../components/GridScan';
import Swal from 'sweetalert2';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const AdminContent = () => {
  const { account, signer } = useWeb3();
  const { currentFactory, createFactory, addExistingFactory, fetchFactories } = useFactory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateFactoryModalOpen, setIsCreateFactoryModalOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [factoryContract, setFactoryContract] = useState(null);
  
  // Staking config state
  const [stakingConfig, setStakingConfig] = useState({ nativeStaking: '', tokenStaking: '' });
  const [stakingInputs, setStakingInputs] = useState({ nativeStaking: '', tokenStaking: '' });
  const [loadingStaking, setLoadingStaking] = useState(false);
  const [savingStaking, setSavingStaking] = useState(false);

  useEffect(() => {
    console.log('🏭 AdminPage: currentFactory changed:', currentFactory);
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
    if (account && factoryContract) {
      fetchMatches();
      fetchStakingAddresses();
    }
  }, [account, factoryContract]);

  const fetchStakingAddresses = async () => {
    if (!factoryContract) return;
    setLoadingStaking(true);
    try {
      const [nativeStaking, tokenStaking] = await factoryContract.getStakingAddresses();
      const config = {
        nativeStaking: nativeStaking === '0x0000000000000000000000000000000000000000' ? '' : nativeStaking,
        tokenStaking: tokenStaking === '0x0000000000000000000000000000000000000000' ? '' : tokenStaking
      };
      setStakingConfig(config);
      setStakingInputs(config);
    } catch (error) {
      console.error('Error fetching staking addresses:', error);
    }
    setLoadingStaking(false);
  };

  const handleSaveStakingAddresses = async () => {
    if (!signer || !currentFactory) return;
    
    const nativeAddr = stakingInputs.nativeStaking.trim() || '0x0000000000000000000000000000000000000000';
    const tokenAddr = stakingInputs.tokenStaking.trim() || '0x0000000000000000000000000000000000000000';
    
    // Validate addresses
    if (stakingInputs.nativeStaking && !ethers.isAddress(stakingInputs.nativeStaking)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Address',
        text: 'Native Staking address is not valid',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }
    if (stakingInputs.tokenStaking && !ethers.isAddress(stakingInputs.tokenStaking)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Address',
        text: 'Token Staking address is not valid',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
      return;
    }

    setSavingStaking(true);
    try {
      const factory = new ethers.Contract(currentFactory, factoryAbi, signer);
      const tx = await factory.setStakingAddresses(nativeAddr, tokenAddr);
      await tx.wait();
      
      await Swal.fire({
        icon: 'success',
        title: 'Staking Configured!',
        text: 'Staking addresses have been set. All new matches will use these addresses.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      
      await fetchStakingAddresses();
    } catch (error) {
      console.error('Error setting staking addresses:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: error.message || 'Failed to set staking addresses',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
    setSavingStaking(false);
  };

  const handleCreateFactory = async (name) => {
    const success = await createFactory(name);
    if (success) {
      await Swal.fire({
        icon: 'success',
        title: 'Factory Deployed!',
        text: 'Your new factory has been deployed and registered successfully.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      await fetchFactories();
      setIsCreateFactoryModalOpen(false);
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Deployment Failed',
        text: 'Failed to deploy factory. Check console for details.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };

  const handleAddExistingFactory = async (address, name) => {
    const success = await addExistingFactory(address, name);
    if (success) {
      await Swal.fire({
        icon: 'success',
        title: 'Factory Registered!',
        html: `Factory <span class="font-mono text-xs">${address.slice(0, 10)}...${address.slice(-8)}</span> has been registered successfully.`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      await fetchFactories();
      setIsCreateFactoryModalOpen(false);
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: 'Failed to register factory. Make sure the address is a valid SportsBettingFactory contract.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };

  const fetchMatches = async () => {
    if (!factoryContract) return;
    setLoading(true);
    try {

      const matchesWithDraw = await factoryContract.getAllMatchesWithDraw();
      const matchesNoDraw = await factoryContract.getAllMatchesNoDraw();

      const allMatches = [];
      
      for (let addr of matchesWithDraw) {
        const isActive = await factoryContract.isMatchActive(addr);
        allMatches.push({ address: addr, type: 'withDraw', isActive });
      }
      
      for (let addr of matchesNoDraw) {
        const isActive = await factoryContract.isMatchActive(addr);
        allMatches.push({ address: addr, type: 'noDraw', isActive });
      }

      setMatches(allMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
    setLoading(false);
  };

  const handleFinalizeResult = async (matchAddress, matchAbi, result, resultName) => {
    const confirmResult = await Swal.fire({
      title: 'Finalize Match Result?',
      html: `
        <p style="margin-bottom: 10px;">Set result as <strong>"${resultName}"</strong></p>
        <div style="text-align: left; margin-top: 15px; padding: 15px; background: rgba(105, 209, 105, 0.1); border-radius: 8px; border: 1px solid rgba(105, 209, 105, 0.3);">
          <p style="margin: 5px 0;"><i class="fa-solid fa-check" style="color: #69d169; margin-right: 8px;"></i>Close the match</p>
          <p style="margin: 5px 0;"><i class="fa-solid fa-check" style="color: #69d169; margin-right: 8px;"></i>Deactivate from public view</p>
          <p style="margin: 5px 0;"><i class="fa-solid fa-check" style="color: #69d169; margin-right: 8px;"></i>Allow winners to claim rewards</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Finalize',
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#69d169',
      cancelButtonColor: '#dc3545',
      iconColor: '#ffc107',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const matchContract = new ethers.Contract(matchAddress, matchAbi, signer);
      
      // Finalize result in match contract
      const tx = await matchContract.finalizeResult(result);
      await tx.wait();

      // Deactivate match in factory
      const factory = new ethers.Contract(
        sportsBettingAddresses.factory,
        factoryAbi,
        signer
      );
      const tx2 = await factory.setMatchActive(matchAddress, false);
      await tx2.wait();

      await Swal.fire({
        icon: 'success',
        title: 'Match Finalized!',
        html: `Result set as <strong>"${resultName}"</strong><br><br>Winners can now claim their rewards.`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      fetchMatches();
    } catch (error) {
      console.error('Error finalizing match:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Finalization Failed',
        text: error.message || 'Failed to finalize match',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };

  const handleDeleteMatch = async (matchAddress, show = false) => {
    const action = show ? 'show' : 'hide';
    const actionPast = show ? 'shown' : 'hidden';
    const actionTitle = show ? 'Show' : 'Hide';
    
    const confirmResult = await Swal.fire({
      title: `${actionTitle} Match?`,
      html: `
        <p style="margin-bottom: 10px;">${actionTitle} this match ${show ? 'to' : 'from'} public view?</p>
        <div style="text-align: left; margin-top: 15px; padding: 15px; background: rgba(105, 209, 105, 0.1); border-radius: 8px; border: 1px solid rgba(105, 209, 105, 0.3);">
          <p style="margin: 5px 0;"><i class="fa-solid fa-check" style="color: #69d169; margin-right: 8px;"></i>Set match as ${show ? 'active' : 'inactive'}</p>
          <p style="margin: 5px 0;"><i class="fa-solid fa-check" style="color: #69d169; margin-right: 8px;"></i>${show ? 'Show in' : 'Hide from'} user interface</p>
          <p style="margin: 10px 0 5px 0; font-size: 12px; color: #888; font-family: monospace;">Contract: ${matchAddress.slice(0, 10)}...${matchAddress.slice(-8)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionTitle}`,
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#69d169',
      cancelButtonColor: '#6c757d',
      iconColor: '#69d169',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const factory = new ethers.Contract(
        currentFactory,
        factoryAbi,
        signer
      );
      
      const tx = await factory.setMatchActive(matchAddress, show);
      await tx.wait();

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Match ${actionPast} successfully!`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
        iconColor: '#69d169',
      });
      fetchMatches();
    } catch (error) {
      console.error(`Error ${action}ing match:`, error);
      await Swal.fire({
        icon: 'error',
        title: 'Operation Failed',
        text: error.message || `Failed to ${action} match`,
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#69d169',
      });
    }
  };

  const handleMatchCreated = () => {
    setIsModalOpen(false);
    fetchMatches();
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 pb-24 md:pb-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-2xl border border-[#69d169]/30 mb-4">
            <i className="fa-solid fa-user-shield text-3xl text-[#69d169]"></i>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-sm text-gray-400">Create and manage sports betting matches</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
            {/* Admin Info */}
            {account && (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-xl flex items-center justify-center border border-[#69d169]/30">
                      <i className="fa-solid fa-user-tie text-[#69d169] text-lg"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-1">
                        Connected as Admin
                      </h3>
                      <p className="text-xs text-gray-400 font-mono flex items-center">
                        <i className="fa-solid fa-wallet text-[10px] mr-1.5"></i>
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 rounded-lg border border-[#69d169]/30">
                    <span className="text-[#69d169] font-bold text-xs flex items-center">
                      <span className="w-1.5 h-1.5 bg-[#69d169] rounded-full mr-2 animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Factory Selector & Management */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center">
                  <i className="fa-solid fa-building text-[#69d169] mr-2"></i>
                  Factory Management
                </h3>
                <button
                  onClick={() => setIsCreateFactoryModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold rounded-xl transition-all text-xs"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Add Factory
                </button>
              </div>
              
              <FactorySelector onChange={() => fetchMatches()} />
              
              {/* Staking Configuration */}
              {currentFactory && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                      <i className="fa-solid fa-coins text-[#69d169] mr-2"></i>
                      Revenue Share Configuration
                    </h4>
                    {loadingStaking && (
                      <i className="fa-solid fa-spinner fa-spin text-[#69d169] text-sm"></i>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    Set staking contract addresses to enable revenue sharing from betting profits.
                  </p>
                  
                  <div className="space-y-3">
                    {/* Native Staking */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">
                        Native Staking (MNT) - 15% share
                      </label>
                      <input
                        type="text"
                        value={stakingInputs.nativeStaking}
                        onChange={(e) => setStakingInputs(prev => ({ ...prev, nativeStaking: e.target.value }))}
                        placeholder="0x... (NativeStaking contract)"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#69d169] focus:border-[#69d169] transition-all text-xs font-mono"
                      />
                      {stakingConfig.nativeStaking && (
                        <p className="text-[10px] text-green-400 mt-1">
                          <i className="fa-solid fa-check-circle mr-1"></i>
                          Current: {stakingConfig.nativeStaking.slice(0, 10)}...{stakingConfig.nativeStaking.slice(-8)}
                        </p>
                      )}
                    </div>
                    
                    {/* Token Staking */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">
                        Token Staking (INTEL) - 10% share
                      </label>
                      <input
                        type="text"
                        value={stakingInputs.tokenStaking}
                        onChange={(e) => setStakingInputs(prev => ({ ...prev, tokenStaking: e.target.value }))}
                        placeholder="0x... (TokenStakingNativeReward contract)"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#69d169] focus:border-[#69d169] transition-all text-xs font-mono"
                      />
                      {stakingConfig.tokenStaking && (
                        <p className="text-[10px] text-green-400 mt-1">
                          <i className="fa-solid fa-check-circle mr-1"></i>
                          Current: {stakingConfig.tokenStaking.slice(0, 10)}...{stakingConfig.tokenStaking.slice(-8)}
                        </p>
                      )}
                    </div>
                    
                    {/* Save Button */}
                    <button
                      onClick={handleSaveStakingAddresses}
                      disabled={savingStaking || (stakingInputs.nativeStaking === stakingConfig.nativeStaking && stakingInputs.tokenStaking === stakingConfig.tokenStaking)}
                      className="w-full px-4 py-2 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 hover:from-[#69d169]/30 hover:to-[#69d169]/20 text-[#69d169] font-semibold rounded-lg transition-all text-xs border border-[#69d169]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingStaking ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-save mr-2"></i>
                          Save Staking Configuration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Match Button */}
            <div className="bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/5 rounded-2xl p-6 border border-[#69d169]/30 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#69d169]/30 to-[#69d169]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#69d169]/40">
                <i className="fa-solid fa-plus-circle text-3xl text-[#69d169]"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Create New Match</h3>
              <p className="text-sm text-gray-400 mb-5">
                Set up a new sports betting match with custom odds and teams
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-90 text-[#0a0a0a] font-bold px-6 py-3 rounded-xl transition-all text-sm"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Create Match
              </button>
            </div>

            {/* Matches List */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center">
                  <i className="fa-solid fa-futbol text-[#69d169] mr-2"></i>
                  All Matches
                  {matches.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-[#69d169]/20 text-[#69d169] text-xs font-bold rounded-full border border-[#69d169]/30">
                      {matches.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={fetchMatches}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#69d169] hover:bg-white/5 rounded-lg transition-all"
                  title="Refresh matches"
                >
                  <i className="fa-solid fa-rotate-right text-sm"></i>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-[#69d169] mb-3"></i>
                  <p className="text-gray-400 font-semibold">Loading matches...</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-700/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-inbox text-3xl text-gray-600"></i>
                  </div>
                  <p className="text-gray-300 font-semibold text-lg mb-2">No Matches Yet</p>
                  <p className="text-sm text-gray-500">Create your first match to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((match) => (
                    <div key={match.address}>
                      <MatchCard
                        matchAddress={match.address}
                        matchAbi={match.type === 'withDraw' ? matchWithDrawAbi : matchNoDrawAbi}
                        matchType={match.type}
                        factoryContract={factoryContract}
                        isActive={match.isActive}
                        isAdmin={true}
                        onFinalizeResult={handleFinalizeResult}
                        onDeleteMatch={handleDeleteMatch}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Create Factory Modal */}
      <CreateFactoryModal
        isOpen={isCreateFactoryModalOpen}
        onClose={() => setIsCreateFactoryModalOpen(false)}
        onSubmit={handleCreateFactory}
        onAddExisting={handleAddExistingFactory}
      />

      {/* Create Match Modal */}
      <CreateMatchModal
        isOpen={isModalOpen}
        onClose={handleMatchCreated}
        factoryAddress={currentFactory || sportsBettingAddresses.factory}
        factoryAbi={factoryAbi}
      />
      </div>
    </>
  );
};

const AdminPage = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme(rainbowTheme)}>
          <Web3Provider>
            <FactoryProvider>
            <div className="min-h-screen" style={{ position: 'relative' }}>
              {/* GridScan Background */}
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
              
              <AdminContent />
            </div>
            </FactoryProvider>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default AdminPage;
