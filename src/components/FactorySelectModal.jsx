import { createPortal } from 'react-dom';

const FactorySelectModal = ({ isOpen, onClose, factories, selectedFactory, onSelect }) => {
  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[201] animate-slide-up">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-t-3xl border-t border-white/10 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-building text-[#69d169]"></i>
              <h3 className="text-lg font-bold text-white">Select Factory</h3>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          {/* Factory List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* All Factories Option */}
            <button
              onClick={() => {
                onSelect('all');
                onClose();
              }}
              className={`w-full text-left p-4 rounded-xl transition-all ${
                selectedFactory === 'all'
                  ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border-2 border-[#69d169]'
                  : 'bg-black/40 border-2 border-transparent hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedFactory === 'all'
                      ? 'bg-[#69d169]/20 border border-[#69d169]/40'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <i className={`fa-solid fa-layer-group ${
                      selectedFactory === 'all' ? 'text-[#69d169]' : 'text-gray-400'
                    }`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">All Factories</div>
                  </div>
                </div>
                {selectedFactory === 'all' && (
                  <i className="fa-solid fa-check text-[#69d169]"></i>
                )}
              </div>
            </button>

            {/* Individual Factories */}
            {factories.map((factory) => {
              const isSelected = selectedFactory === factory.address;
              
              return (
                <button
                  key={factory.address}
                  onClick={() => {
                    onSelect(factory.address);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border-2 border-[#69d169]'
                      : 'bg-black/40 border-2 border-transparent hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#69d169]/20 border border-[#69d169]/40'
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <i className={`fa-solid fa-building ${
                          isSelected ? 'text-[#69d169]' : 'text-gray-400'
                        }`}></i>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{factory.name}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-check text-[#69d169]"></i>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default FactorySelectModal;
