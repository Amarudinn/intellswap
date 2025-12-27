import { useState } from 'react';
import { useFactory } from '../context/FactoryContext';

const FactorySelector = ({ onChange }) => {
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const { factories, currentFactory, switchFactory, loading } = useFactory();

  const handleChange = (e) => {
    const newFactory = e.target.value;
    switchFactory(newFactory);
    onChange?.(newFactory);
  };

  if (loading) {
    return (
      <div className="mb-4 p-3 bg-black/40 rounded-lg border border-white/10">
        <i className="fa-solid fa-spinner fa-spin text-[#69d169] mr-2"></i>
        <span className="text-gray-400 text-sm">Loading factories...</span>
      </div>
    );
  }

  if (factories.length === 0) {
    return null;
  }

  // Don't show selector if only one factory
  if (factories.length === 1) {
    return null;
  }

  const currentFactoryData = factories.find(f => f.address === currentFactory);

  return (
    <div className="mb-4">
      <label className="text-sm font-semibold text-gray-300 mb-2 block flex items-center">
        <i className="fa-solid fa-building text-[#69d169] mr-2"></i>
        Select Factory
      </label>
      
      {/* Custom Dropdown - Works for both desktop and mobile */}
      <div className="relative z-10">
        {/* Dropdown Button */}
        <button
          onClick={() => setIsDesktopDropdownOpen(!isDesktopDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 md:py-4 rounded-xl border-2 border-[#69d169]/20 hover:border-[#69d169]/40 focus:ring-2 focus:ring-[#69d169] focus:border-[#69d169] focus:outline-none transition-all duration-200 shadow-lg hover:shadow-xl group"
          style={{
            background: 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,20,0.95) 100%)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex items-center space-x-3">
            {/* Icon Box */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#69d169]/20 to-[#69d169]/10 flex items-center justify-center border border-[#69d169]/30 group-hover:border-[#69d169]/50 transition-all flex-shrink-0">
              <i className="fa-solid fa-building text-[#69d169] text-sm"></i>
            </div>
            {/* Text */}
            <span className="text-white font-semibold text-base">
              {currentFactoryData?.name || 'Select Factory'}
            </span>
          </div>
          {/* Chevron */}
          <i className={`fa-solid fa-chevron-down text-[#69d169] transition-transform ${isDesktopDropdownOpen ? 'rotate-180' : ''}`}></i>
        </button>

        {/* Custom Dropdown Menu */}
        {isDesktopDropdownOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-[150]" 
              onClick={() => setIsDesktopDropdownOpen(false)}
            />
            
            {/* Dropdown List */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border-2 border-[#69d169]/30 shadow-2xl overflow-hidden z-[151] animate-fade-in">
              <div className="max-h-[400px] overflow-y-auto">
                {/* Factory Options */}
                {factories.map((factory, index) => {
                  const isSelected = currentFactory === factory.address;
                  
                  return (
                    <button
                      key={factory.address}
                      onClick={() => {
                        handleChange({ target: { value: factory.address } });
                        setIsDesktopDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-4 transition-all ${
                        index < factories.length - 1 ? 'border-b border-[#69d169]/10' : ''
                      } ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <i className={`fa-solid ${factory.active ? 'fa-trophy' : 'fa-folder'} text-[#69d169] text-sm`}></i>
                          <span className={`font-semibold ${isSelected ? 'text-white' : factory.active ? 'text-white' : 'text-gray-400'}`}>
                            {factory.name}
                          </span>
                        </div>
                        {isSelected && <i className="fa-solid fa-check text-[#69d169]"></i>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>


    </div>
  );
};

export default FactorySelector;
