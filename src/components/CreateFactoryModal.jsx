import { useState } from 'react';
import { ethers } from 'ethers';

const CreateFactoryModal = ({ isOpen, onClose, onSubmit, onAddExisting }) => {
  const [factoryName, setFactoryName] = useState('');
  const [factoryAddress, setFactoryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState('register'); // 'register' or 'deploy'

  if (!isOpen) return null;

  const isValidAddress = (address) => {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!factoryName.trim()) return;

    setIsSubmitting(true);
    
    if (mode === 'register') {
      // Register existing factory
      if (!isValidAddress(factoryAddress)) {
        setIsSubmitting(false);
        return;
      }
      await onAddExisting(factoryAddress.trim(), factoryName.trim());
    } else {
      // Deploy new factory (legacy flow)
      await onSubmit(factoryName.trim());
    }
    
    setIsSubmitting(false);
    setFactoryName('');
    setFactoryAddress('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFactoryName('');
      setFactoryAddress('');
      setMode('register');
      onClose();
    }
  };

  const canSubmit = mode === 'register' 
    ? factoryName.trim() && isValidAddress(factoryAddress)
    : factoryName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border-2 border-[#69d169]/30 shadow-2xl max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 rounded-xl flex items-center justify-center border border-[#69d169]/30">
                <i className="fa-solid fa-building text-[#69d169] text-lg"></i>
              </div>
              <h3 className="text-xl font-bold text-white">Add Factory</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-[#69d169] text-[#0a0a0a]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-link mr-2"></i>
              Register Existing
            </button>
            <button
              type="button"
              onClick={() => setMode('deploy')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'deploy'
                  ? 'bg-[#69d169] text-[#0a0a0a]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-rocket mr-2"></i>
              Deploy New
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {mode === 'register' && (
            <>
              {/* Info Box */}
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-xs text-blue-400">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Deploy SportsBettingFactory.sol from Remix/Hardhat first, then paste the address here to register it.
                </p>
              </div>

              {/* Factory Address */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Factory Contract Address
                </label>
                <input
                  type="text"
                  value={factoryAddress}
                  onChange={(e) => setFactoryAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 bg-black/40 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] transition-all disabled:opacity-50 font-mono text-sm ${
                    factoryAddress && !isValidAddress(factoryAddress)
                      ? 'border-red-500/50'
                      : 'border-white/10'
                  }`}
                  autoFocus
                />
                {factoryAddress && !isValidAddress(factoryAddress) && (
                  <p className="mt-1 text-xs text-red-400">
                    <i className="fa-solid fa-exclamation-circle mr-1"></i>
                    Invalid address format
                  </p>
                )}
              </div>
            </>
          )}

          {mode === 'deploy' && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-xs text-yellow-400">
                <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                This will deploy a new SportsBettingFactory contract. Make sure you have enough gas.
              </p>
            </div>
          )}

          {/* Factory Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Factory Name
            </label>
            <input
              type="text"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              placeholder='e.g., "Premier League March 2025"'
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] transition-all disabled:opacity-50"
              autoFocus={mode === 'deploy'}
            />
            <p className="mt-2 text-xs text-gray-500">
              <i className="fa-solid fa-info-circle mr-1"></i>
              Choose a descriptive name for your betting factory
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-black/40 hover:bg-black/60 text-gray-300 font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-[#0a0a0a] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  {mode === 'register' ? 'Registering...' : 'Deploying...'}
                </>
              ) : (
                <>
                  <i className={`fa-solid ${mode === 'register' ? 'fa-link' : 'fa-rocket'} mr-2`}></i>
                  {mode === 'register' ? 'Register Factory' : 'Deploy Factory'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFactoryModal;
