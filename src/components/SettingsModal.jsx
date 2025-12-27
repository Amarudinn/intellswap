import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const SettingsModal = ({ isOpen, onClose, slippage, setSlippage }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const presetSlippages = [0.1, 0.5, 1];

  const handlePresetClick = (value) => {
    setSlippage(value);
    setIsCustom(false);
    setCustomValue('');
  };

  const handleCustomInput = (e) => {
    const value = e.target.value;
    setCustomValue(value);
    setIsCustom(true);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      setSlippage(numValue);
    }
  };

  const isHighSlippage = slippage > 5;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black backdrop-blur-sm z-[100] cursor-pointer transition-opacity duration-200 ${
          isVisible ? 'opacity-60' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div className={`bg-[#141414] rounded-2xl w-full max-w-sm border border-white/10 pointer-events-auto transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg text-white font-semibold">Transaction Settings</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl transition-colors">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <i className="fa-solid fa-sliders text-[#69d169]"></i>
              <label className="font-medium text-white">Slippage tolerance</label>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Price protection for your swap. If prices move beyond your set percentage during processing, the transaction cancels automatically.
            </p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {presetSlippages.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className={`py-2 rounded-lg font-semibold transition-colors text-center ${
                      !isCustom && slippage === preset
                        ? 'bg-[#69d169] text-[#1c1c1c]'
                        : 'bg-black/20 hover:bg-black/40 text-gray-300'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    setIsCustom(true);
                    setTimeout(() => {
                      document.querySelector('input[placeholder="Enter custom slippage"]')?.focus();
                    }, 100);
                  }}
                  className={`py-2 rounded-lg font-semibold transition-colors text-center ${
                    isCustom
                      ? 'bg-[#69d169] text-[#1c1c1c]'
                      : 'bg-black/20 hover:bg-black/40 text-gray-300'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {isCustom && (
                <div className="relative">
                  <input
                    type="text"
                    value={customValue}
                    onChange={handleCustomInput}
                    className="w-full bg-black/20 text-white p-3 border border-[#69d169] rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none transition-all pr-8"
                    placeholder="Enter custom slippage"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">%</span>
                </div>
              )}
              
              {isHighSlippage && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <i className="fa-solid fa-triangle-exclamation text-yellow-400 mt-0.5"></i>
                  <p className="text-yellow-400 text-xs">
                    High slippage tolerance may result in unfavorable trades
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;
