import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect, useAccount } from 'wagmi';
import { formatBalance } from '../utils/formatBalance';

const Navbar = () => {
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const [balance, setBalance] = useState('0.0');
  const [showCopied, setShowCopied] = useState(false);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const currentPath = window.location.pathname;

  // Fetch balance using MetaMask provider directly (avoids CORS issues)
  const fetchBalance = async () => {
    if (address && window.ethereum) {
      try {
        const balanceHex = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        const balanceWei = BigInt(balanceHex);
        const balanceEth = Number(balanceWei) / 1e18;
        setBalance(formatBalance(balanceEth.toFixed(4)));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0.0');
      }
    } else {
      setBalance('0.0');
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [address]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAccountPopup && !event.target.closest('.account-popup-container')) {
        setShowAccountPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountPopup]);

  return (
    <>
      {/* Copied Toast */}
      {showCopied && (
        <div className="fixed top-20 left-0 right-0 z-[100] flex justify-center animate-fade-in">
          <div className="bg-[#69d169] text-[#1c1c1c] rounded-full px-4 py-2 flex items-center space-x-2 font-semibold">
            <i className="fa-solid fa-check"></i>
            <span>Copied to clipboard</span>
          </div>
        </div>
      )}
      
      <nav className="glass-card fixed top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <a href="/" className="flex items-center space-x-3">
                <img className="h-8 w-auto" src="/icon.svg" alt="IntellSwap" />
                <span className="hidden md:block text-2xl font-bold gradient-text">IntellSwap</span>
              </a>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <a 
                href="/" 
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  currentPath === '/' 
                    ? 'text-white bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Swap
              </a>
              
              <a 
                href="/staking" 
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  currentPath === '/staking' 
                    ? 'text-white bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Staking
              </a>
              
              <a 
                href="/prediction" 
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  currentPath === '/prediction' 
                    ? 'text-white bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Prediction
              </a>
              
              <a 
                href="/docs" 
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  currentPath === '/docs' 
                    ? 'text-white bg-gradient-to-r from-[#69d169]/20 to-[#69d169]/10 border border-[#69d169]/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Docs
              </a>
            </div>

            <div className="flex items-center space-x-2">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="btn btn-primary px-6 py-2 text-sm"
                            >
                              <i className="fa-solid fa-wallet mr-2"></i>
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              className="btn btn-danger px-4 py-2 text-sm"
                            >
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div className="flex items-center space-x-2">
                            {/* Network Badge */}
                            <button
                              onClick={openChainModal}
                              className="flex items-center bg-black/30 text-gray-300 font-semibold py-2 px-3 md:px-4 rounded-full border border-white/10 hover:border-green-500/50 transition-all"
                            >
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                              <span className="hidden md:block text-sm">{chain.name}</span>
                              <img src="/mantle-logo.svg" alt="Mantle Testnet" className="md:hidden w-5 h-5" />
                            </button>

                            {/* Account Button */}
                            <div className="relative account-popup-container">
                              <button
                                onClick={() => setShowAccountPopup(!showAccountPopup)}
                                className="flex items-center space-x-2 bg-black/30 text-gray-300 font-semibold py-2 px-4 rounded-full border border-white/10 hover:border-[#69d169]/50 transition-all"
                              >
                                <i className="fa-solid fa-wallet text-[#69d169]"></i>
                                <span className="text-white text-sm font-semibold">
                                  {account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)}
                                </span>
                              </button>

                              {/* Account Popup */}
                              {showAccountPopup && (
                                <div className="absolute right-0 mt-2 w-72 bg-[#141414] rounded-xl border border-white/10 p-4 animate-fade-in z-50">
                                  <div className="space-y-3">
                                    {/* Balance */}
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-400">Balance:</p>
                                        <button
                                          onClick={fetchBalance}
                                          className="text-gray-400 hover:text-white transition-colors px-1"
                                          title="Refresh balance"
                                        >
                                          <i className="fa-solid fa-refresh text-xs"></i>
                                        </button>
                                      </div>
                                      <p className="text-lg text-white font-semibold">
                                        {balance} MNT
                                      </p>
                                    </div>

                                    {/* Address */}
                                    <div>
                                      <p className="text-xs text-gray-400">Address</p>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white font-mono">
                                          {account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)}
                                        </p>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(account.address);
                                            setShowCopied(true);
                                            setTimeout(() => setShowCopied(false), 2000);
                                          }}
                                          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors py-1 px-2 hover:bg-white/5 rounded"
                                        >
                                          <i className="fa-regular fa-clone text-xs"></i>
                                          <span className="text-xs">Copy</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 border-t border-white/10">
                                      <a
                                        href={`https://sepolia.mantlescan.xyz/address/${account.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                      >
                                        <i className="fa-solid fa-external-link-alt text-sm"></i>
                                        <span className="text-sm text-white">View on Explorer</span>
                                      </a>
                                    </div>

                                    {/* Disconnect */}
                                    <button
                                      onClick={() => {
                                        disconnect();
                                        setShowAccountPopup(false);
                                      }}
                                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    >
                                      <i className="fa-solid fa-right-from-bracket text-sm"></i>
                                      <span className="text-sm font-semibold">Disconnect</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-card border-t border-white/10">
        <div className="flex items-center justify-around h-16 px-2">
          <a 
            href="/" 
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              currentPath === '/' 
                ? 'text-[#69d169]' 
                : 'text-gray-400'
            }`}
          >
            <i className="fa-solid fa-repeat text-xl mb-1"></i>
            <span className="text-xs font-semibold">Swap</span>
          </a>
          
          <a 
            href="/staking" 
            className={`relative flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              currentPath === '/staking' 
                ? 'text-[#69d169]' 
                : 'text-gray-400'
            }`}
          >
            <i className="fa-solid fa-coins text-xl mb-1"></i>
            <span className="text-xs font-semibold">Staking</span>
          </a>
          
          <a 
            href="/prediction" 
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              currentPath === '/prediction' 
                ? 'text-[#69d169]' 
                : 'text-gray-400'
            }`}
          >
            <i className="fa-solid fa-futbol text-xl mb-1"></i>
            <span className="text-xs font-semibold">Prediction</span>
          </a>
          
          <a 
            href="/docs" 
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              currentPath === '/docs' 
                ? 'text-[#69d169]' 
                : 'text-gray-400'
            }`}
          >
            <i className="fa-solid fa-book text-xl mb-1"></i>
            <span className="text-xs font-semibold">Docs</span>
          </a>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
