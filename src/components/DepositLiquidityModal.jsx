import { useState } from 'react';

const DepositLiquidityModal = ({ isOpen, onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    await onSubmit(amount);
    setIsSubmitting(false);
    setAmount('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      onClose();
    }
  };

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
                <i className="fa-solid fa-coins text-[#69d169] text-lg"></i>
              </div>
              <h3 className="text-xl font-bold text-white">Deposit Liquidity</h3>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Amount (MNT)
            </label>
            <input
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to deposit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] transition-all disabled:opacity-50"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              <i className="fa-solid fa-info-circle mr-1"></i>
              This liquidity will be used to cover potential payouts
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2">Quick amounts:</p>
            <div className="grid grid-cols-4 gap-2">
              {['1', '5', '10', '50'].map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount)}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-black/40 hover:bg-[#69d169]/20 border border-white/10 hover:border-[#69d169]/50 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-semibold disabled:opacity-50"
                >
                  {quickAmount}
                </button>
              ))}
            </div>
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
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-br from-[#69d169] to-[#5bc15b] hover:brightness-110 text-[#0a0a0a] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Depositing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-down mr-2"></i>
                  Deposit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositLiquidityModal;
