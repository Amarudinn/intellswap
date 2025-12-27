const StakingPoolSelector = ({ pools, selectedPool, onSelectPool, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[150]" 
        onClick={onClose}
      />
      
      {/* Dropdown List */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border-2 border-[#69d169]/30 shadow-2xl overflow-hidden z-[151] animate-fade-in">
        <div className="max-h-[400px] overflow-y-auto">
          {pools.map((pool, index) => {
            const isSelected = selectedPool.id === pool.id;
            
            return (
              <button
                key={pool.id}
                onClick={() => {
                  onSelectPool(pool);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 transition-all ${
                  index < pools.length - 1 ? 'border-b border-[#69d169]/10' : ''
                } ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={pool.stakingToken.logoURI} 
                      alt={pool.stakingToken.symbol}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {pool.name}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          pool.type === 'native' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {pool.type === 'native' ? 'Native' : 'ERC20'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{pool.description}</p>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-gray-400">APY: <span className="text-[#69d169] font-bold">{pool.apy}%</span></span>
                        {pool.revenueShare > 0 && (
                          <span className="text-yellow-400">+{pool.revenueShare}% Revenue</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && <i className="fa-solid fa-check text-[#69d169] text-sm"></i>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default StakingPoolSelector;
