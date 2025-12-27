import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Web3Provider } from './context/Web3Context';
import { config, rainbowTheme } from './config/wagmi';
import Navbar from './components/Navbar';
import GridScan from './components/GridScan';
import SwapTab from './components/SwapTab';
import PoolTab from './components/PoolTab';
import Alert from './components/Alert';
import SettingsModal from './components/SettingsModal';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function App() {
  const [activeTab, setActiveTab] = useState('swap');
  const [alerts, setAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState(0.5);

  const showAlert = (message, type = 'info', txHash = null) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message, type, txHash }]);
  };

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme(rainbowTheme)}>
          <Web3Provider>
      <div className="min-h-screen" style={{ position: 'relative' }}>
        {/* GridScan Background - All devices */}
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
        <Navbar />

        {/* Alert Container */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              message={alert.message}
              type={alert.type}
              txHash={alert.txHash}
              explorerUrl="https://sepolia.mantlescan.xyz"
              onClose={() => removeAlert(alert.id)}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="min-h-screen flex items-center justify-center pt-20 pb-8 md:pb-8 pb-24 px-4">
          <div className="w-full max-w-md">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-6 w-full animate-fade-in border border-white/10">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold gradient-text">Swap & Pool</h1>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="text-gray-400 hover:text-white transition-colors transform hover:rotate-90 duration-300"
                  >
                    <i className="fa-solid fa-gear text-xl"></i>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/30 p-1 rounded-full mb-6">
                  <button
                    onClick={() => setActiveTab('swap')}
                    className={`rounded-full flex-1 py-2.5 font-semibold focus:outline-none transition-all ${
                      activeTab === 'swap' 
                        ? 'bg-[#69d169] text-[#1c1c1c]' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Swap
                  </button>
                  <button
                    onClick={() => setActiveTab('pool')}
                    className={`rounded-full flex-1 py-2.5 font-semibold focus:outline-none transition-all ${
                      activeTab === 'pool' 
                        ? 'bg-[#69d169] text-[#1c1c1c]' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Pool
                  </button>
                </div>

              {/* Tab Content */}
              {activeTab === 'swap' ? (
                <SwapTab showAlert={showAlert} slippage={slippage} />
              ) : (
                <PoolTab showAlert={showAlert} slippage={slippage} />
              )}
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          slippage={slippage}
          setSlippage={setSlippage}
        />
      </div>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
