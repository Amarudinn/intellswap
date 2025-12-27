import { useState } from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ isOpen, onClose, onConfirm, priceImpact }) => {
  const [confirmText, setConfirmText] = useState('');
  
  if (!isOpen) return null;

  const needsTextConfirm = priceImpact > 10;
  const canConfirm = needsTextConfirm ? confirmText.toLowerCase() === 'confirm' : true;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black backdrop-blur-sm z-[100]"
        style={{ opacity: 0.6 }}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div className="bg-[#141414] rounded-2xl w-full max-w-sm border border-white/10 pointer-events-auto animate-fade-in">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-yellow-400 text-2xl"></i>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">
              High Price Impact Warning
            </h3>
            
            <p className="text-gray-300 text-center mb-4">
              This swap has a price impact of <span className="text-red-400 font-bold">{priceImpact}%</span>. 
              You may receive significantly less than expected.
            </p>

            {needsTextConfirm && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  Type <span className="text-white font-bold">confirm</span> to continue:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="confirm"
                  className="w-full bg-black/20 text-white p-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-lg font-semibold text-sm bg-black/40 hover:bg-black/60 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className="flex-1 py-2.5 px-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
