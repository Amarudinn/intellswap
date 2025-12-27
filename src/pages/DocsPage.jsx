import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Web3Provider } from '../context/Web3Context';
import { config, rainbowTheme } from '../config/wagmi';
import Navbar from '../components/Navbar';
import GridScan from '../components/GridScan';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const DocsContent = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: 'fa-home' },
    { id: 'swap', title: 'Swap & Pool', icon: 'fa-repeat' },
    { id: 'staking', title: 'Staking', icon: 'fa-coins' },
    { id: 'prediction', title: 'Prediction', icon: 'fa-futbol' },
    { id: 'contracts', title: 'Smart Contracts', icon: 'fa-file-code' },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 pb-24 md:pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-4 border border-white/10 lg:sticky lg:top-24">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <i className="fa-solid fa-book text-[#69d169] mr-2"></i>
                  Documentation
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 flex items-center space-x-2 border ${
                        activeSection === section.id
                          ? 'bg-[#69d169]/20 text-[#69d169] border-[#69d169]/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <i className={`fa-solid ${section.icon} text-sm w-5`}></i>
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-6 border border-white/10">
                {activeSection === 'overview' && <OverviewSection />}
                {activeSection === 'swap' && <SwapSection />}
                {activeSection === 'staking' && <StakingSection />}
                {activeSection === 'prediction' && <PredictionSection />}
                {activeSection === 'contracts' && <ContractsSection />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const OverviewSection = () => {
  const [copied, setCopied] = useState(false);
  const rpcUrl = 'https://rpc.sepolia.mantle.xyz';
  
  const copyRpc = () => {
    navigator.clipboard.writeText(rpcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">IntellSwap DeFi Platform</h1>
      <p className="text-gray-400">
        Your gateway to decentralized finance on Mantle Testnet Network — swap, stake, and predict with confidence.
      </p>
    </div>

    {/* Features */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-4">Features</h3>
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-[#69d169]/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-repeat text-[#69d169] text-sm"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">Swap & Pool</h4>
            <p className="text-gray-500 text-xs">Instant token swaps with AMM. Provide liquidity and earn 0.3% fees on every trade.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-[#69d169]/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-coins text-[#69d169] text-sm"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">Staking</h4>
            <p className="text-gray-500 text-xs">Stake MNT or INTEL to earn APY rewards plus bonus revenue share from betting profits.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-[#69d169]/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-futbol text-[#69d169] text-sm"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">Prediction</h4>
            <p className="text-gray-500 text-xs">Bet on sports matches with fixed odds. Fully on-chain and trustless.</p>
          </div>
        </div>
      </div>
    </div>

    {/* Network Information */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-4">Network</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Network</span>
          <span className="text-white">Mantle Testnet</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Chain ID</span>
          <span className="text-white">5003</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Native Token</span>
          <span className="text-white">MNT</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">RPC URL</span>
          <button 
            onClick={copyRpc}
            className="flex items-center space-x-2 bg-black/30 px-2 py-1 rounded hover:bg-black/50 transition-colors"
          >
            <span className="text-white text-xs">{rpcUrl}</span>
            {copied ? (
              <i className="fa-solid fa-check text-[#69d169] text-xs"></i>
            ) : (
              <i className="fa-solid fa-copy text-gray-400 text-xs"></i>
            )}
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Explorer</span>
          <a href="https://sepolia.mantlescan.xyz" target="_blank" rel="noopener noreferrer" className="text-[#69d169] hover:underline">
            sepolia.mantlescan.xyz
          </a>
        </div>
      </div>
    </div>

    {/* Quick Links */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-4">Quick Start</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <a href="/swap" className="flex items-center space-x-2 text-gray-400 hover:text-[#69d169] transition-colors">
          <i className="fa-solid fa-arrow-right text-xs"></i>
          <span>Start Swapping</span>
        </a>
        <a href="/staking" className="flex items-center space-x-2 text-gray-400 hover:text-[#69d169] transition-colors">
          <i className="fa-solid fa-arrow-right text-xs"></i>
          <span>Stake Tokens</span>
        </a>
        <a href="/prediction" className="flex items-center space-x-2 text-gray-400 hover:text-[#69d169] transition-colors">
          <i className="fa-solid fa-arrow-right text-xs"></i>
          <span>Place Bets</span>
        </a>
        <a href="https://sepolia.mantlescan.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-400 hover:text-[#69d169] transition-colors">
          <i className="fa-solid fa-arrow-right text-xs"></i>
          <span>View Explorer</span>
        </a>
      </div>
    </div>
  </div>
  );
};

const SwapSection = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">Swap & Pool</h1>
    <p className="text-gray-400">
      Decentralized exchange for swapping tokens and providing liquidity using Automated Market Maker (AMM) model.
    </p>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Features</h3>
      <ul className="space-y-2 text-gray-400">
        <li className="flex items-start space-x-2">
          <i className="fa-solid fa-check text-[#69d169] mt-1"></i>
          <span>Token-to-token swaps via AMM</span>
        </li>
        <li className="flex items-start space-x-2">
          <i className="fa-solid fa-check text-[#69d169] mt-1"></i>
          <span>Liquidity pool management (add/remove liquidity)</span>
        </li>
        <li className="flex items-start space-x-2">
          <i className="fa-solid fa-check text-[#69d169] mt-1"></i>
          <span>Automatic price calculation</span>
        </li>
        <li className="flex items-start space-x-2">
          <i className="fa-solid fa-check text-[#69d169] mt-1"></i>
          <span>Slippage protection</span>
        </li>
        <li className="flex items-start space-x-2">
          <i className="fa-solid fa-check text-[#69d169] mt-1"></i>
          <span>Multi-hop routing through MNT</span>
        </li>
      </ul>
    </div>

    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-3">How to Swap</h3>
      <ol className="space-y-2 text-gray-400 text-sm list-decimal list-inside pl-4">
        <li>Select input token (You pay)</li>
        <li>Select output token (You receive)</li>
        <li>Enter amount to swap</li>
        <li>Review price and slippage</li>
        <li>Click "Swap" and confirm transaction</li>
      </ol>
    </div>

    <div className="border-t border-white/10 pt-4 mt-6">
      <h3 className="text-white font-semibold mb-3">Liquidity Provider Fee</h3>
      <p className="text-gray-400 text-sm pl-4">
        0.3% fee on each swap, distributed to liquidity providers proportionally.
      </p>
    </div>
  </div>
);

const StakingSection = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">Staking</h1>
    <p className="text-gray-400">
      Stake tokens to earn APY rewards plus bonus revenue from betting profits.
    </p>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Supported Pools</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              <th className="pb-2">Pool</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">APY</th>
              <th className="pb-2">Revenue Share</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2">MNT</td>
              <td className="py-2"><span className="text-blue-400">Native</span></td>
              <td className="py-2 text-[#69d169]">14%</td>
              <td className="py-2 text-yellow-400">15%</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">INTEL</td>
              <td className="py-2"><span className="text-purple-400">ERC20</span></td>
              <td className="py-2 text-[#69d169]">7%</td>
              <td className="py-2 text-yellow-400">10%</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">USDC</td>
              <td className="py-2"><span className="text-purple-400">ERC20</span></td>
              <td className="py-2 text-[#69d169]">7%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-3">Revenue Share System</h3>
      <p className="text-gray-400 text-sm mb-3">
        When match owner withdraws betting profit, a percentage is distributed to stakers:
      </p>
      <ul className="space-y-1 text-sm text-gray-400 pl-4">
        <li>• 15% of profit → MNT stakers</li>
        <li>• 10% of profit → INTEL stakers</li>
        <li>• Revenue distributed pro-rata based on stake amount</li>
      </ul>
      
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 text-sm font-medium mb-2">
          <i className="fa-solid fa-info-circle mr-1"></i>
          Important: Only profit is shared
        </p>
        <p className="text-gray-400 text-sm">
          Revenue share only applies when owner makes profit. If owner loses, stakers receive nothing from that match.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <h4 className="text-white text-sm font-medium">Example:</h4>
        <p className="text-gray-400 text-sm">Owner deposits 20 MNT as initial liquidity to open a match.</p>
        
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm font-medium mb-2">
            <i className="fa-solid fa-check-circle mr-1"></i>
            If Owner Profit
          </p>
          <div className="text-gray-400 text-xs space-y-1">
            <p>• Initial liquidity: 20 MNT</p>
            <p>• Total bets collected: 100 MNT</p>
            <p>• Total payouts to winners: 80 MNT</p>
            <p>• Final balance: 40 MNT (20 + 100 - 80)</p>
            <p>• Owner profit: 20 MNT (40 - 20)</p>
            <p className="text-green-400 pt-1">→ MNT stakers receive: 3 MNT (15% of 20)</p>
            <p className="text-green-400">→ INTEL stakers receive: 2 MNT (10% of 20)</p>
            <p className="text-white pt-1">→ Owner receives: 35 MNT (40 - 3 - 2)</p>
          </div>
        </div>

        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm font-medium mb-2">
            <i className="fa-solid fa-times-circle mr-1"></i>
            If Owner Loss
          </p>
          <div className="text-gray-400 text-xs space-y-1">
            <p>• Initial liquidity: 20 MNT</p>
            <p>• Total bets collected: 100 MNT</p>
            <p>• Total payouts to winners: 110 MNT</p>
            <p>• Final balance: 10 MNT (20 + 100 - 110)</p>
            <p>• Owner loss: -10 MNT (10 - 20)</p>
            <p className="text-red-400 pt-1">→ MNT stakers receive: 0 MNT</p>
            <p className="text-red-400">→ INTEL stakers receive: 0 MNT</p>
            <p className="text-white pt-1">→ Owner receives: 10 MNT (remaining balance)</p>
          </div>
        </div>
      </div>
    </div>

    <div className="border-t border-white/10 pt-4 mt-6">
      <h3 className="text-white font-semibold mb-4">Revenue Flow:</h3>
      
      <div className="flex flex-col items-center">
        <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
          <p className="text-blue-400 font-semibold text-sm">Owner</p>
          <p className="text-gray-500 text-xs">Match Creator</p>
        </div>
        
        <div className="w-0.5 h-4 bg-gray-600"></div>
        <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
        <span className="text-gray-500 text-xs">execute</span>
        
        <div className="mt-2 bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 text-center">
          <p className="text-purple-400 font-semibold text-sm">Withdraw Profit</p>
          <p className="text-gray-500 text-xs">withdrawProfit()</p>
        </div>
        
        <div className="w-0.5 h-4 bg-gray-600"></div>
        <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
        <span className="text-gray-500 text-xs">distribute revenue</span>
        
        <div className="mt-2 flex items-center space-x-4">
          <div className="bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-3 py-2 text-center">
            <p className="text-[#69d169] font-semibold text-xs">MNT Stakers</p>
            <p className="text-gray-500 text-xs">15% profit</p>
          </div>
          <div className="bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-3 py-2 text-center">
            <p className="text-[#69d169] font-semibold text-xs">INTEL Stakers</p>
            <p className="text-gray-500 text-xs">10% profit</p>
          </div>
        </div>
      </div>
    </div>

    <div className="border-t border-white/10 pt-4 mt-6">
      <h3 className="text-white font-semibold mb-3">How to Stake</h3>
      <ol className="space-y-2 text-gray-400 text-sm list-decimal list-inside pl-4">
        <li>Select staking pool (MNT, INTEL & USDC)</li>
        <li>Enter amount to stake</li>
        <li>Click "Stake" and confirm transaction</li>
        <li>Earn APY rewards over time</li>
        <li>Receive bonus when betting profits are distributed</li>
        <li>Claim all rewards anytime</li>
      </ol>
    </div>
  </div>
);

const PredictionSection = () => {
  const [flowMode, setFlowMode] = useState('manual');
  const [execMode, setExecMode] = useState('manual');
  
  return (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">Prediction (Sports Betting)</h1>
    <p className="text-gray-400">
      Predict, bet, and win on your favorite sports matches — fully on-chain and trustless.
    </p>

    {/* Contract Architecture Flowchart */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white font-semibold mb-4">Contract Architecture:</h3>
      
      {/* Toggle Switch */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-black/40 p-1 rounded-full">
          <button
            onClick={() => setFlowMode('manual')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 border ${
              flowMode === 'manual'
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setFlowMode('automatic')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 border ${
              flowMode === 'automatic'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Automatic
          </button>
        </div>
      </div>
      
      {/* Manual Flowchart */}
      {flowMode === 'manual' && (
        <div className="flex flex-col items-center">
          <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-blue-400 font-semibold text-sm">MasterFactory.sol</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          
          <div className="mt-2 bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-purple-400 font-semibold text-sm">SportsBettingFactory.sol</p>
            <p className="text-gray-500 text-xs">deploy manual</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">register</span>
          
          <div className="mt-2 bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-blue-400 font-semibold text-sm">MasterFactory.sol</p>
            <p className="text-gray-500 text-xs">input: contract + name</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">create match</span>
          
          <div className="mt-2 flex items-center space-x-3">
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchWithDraw.sol</p>
            </div>
            <span className="text-gray-500">/</span>
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchNoDraw.sol</p>
            </div>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">display</span>
          
          <div className="mt-2 bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-4 py-2 text-center">
            <p className="text-[#69d169] font-semibold text-sm">MatchCard</p>
            <p className="text-gray-500 text-xs">UI Component</p>
          </div>
        </div>
      )}
      
      {/* Automatic Flowchart */}
      {flowMode === 'automatic' && (
        <div className="flex flex-col items-center">
          <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-blue-400 font-semibold text-sm">MasterFactory.sol</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">create</span>
          
          <div className="mt-2 bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-purple-400 font-semibold text-sm">SportsBettingFactory.sol</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">create match</span>
          
          <div className="mt-2 flex items-center space-x-3">
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchWithDraw.sol</p>
            </div>
            <span className="text-gray-500">/</span>
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchNoDraw.sol</p>
            </div>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">display</span>
          
          <div className="mt-2 bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-4 py-2 text-center">
            <p className="text-[#69d169] font-semibold text-sm">MatchCard</p>
            <p className="text-gray-500 text-xs">UI Component</p>
          </div>
        </div>
      )}
    </div>

    {/* Execution Flow Flowchart */}
    <div className="border-t border-white/10 pt-4 mt-8">
      <h3 className="text-white font-semibold mb-4">Execution:</h3>
      
      {/* Toggle Switch */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-black/40 p-1 rounded-full">
          <button
            onClick={() => setExecMode('manual')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 border ${
              execMode === 'manual'
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setExecMode('automatic')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 border ${
              execMode === 'automatic'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            Automatic
          </button>
        </div>
      </div>
      
      {/* Manual Execution Flow */}
      {execMode === 'manual' && (
        <div className="flex flex-col items-center">
          <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-blue-400 font-semibold text-sm">Owner</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">create match</span>
          
          <div className="mt-2 flex items-center space-x-3">
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchWithDraw.sol</p>
            </div>
            <span className="text-gray-500">/</span>
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 text-center">
              <p className="text-orange-400 font-semibold text-xs">MatchNoDraw.sol</p>
            </div>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          <span className="text-gray-500 text-xs">deposit</span>
          
          <div className="mt-2 bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-4 py-2 text-center">
            <p className="text-[#69d169] font-semibold text-sm">MatchCard</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          
          <div className="mt-2 bg-orange-500/20 border border-orange-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-orange-400 font-semibold text-sm">Select Winner</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
          
          <div className="mt-2 bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 text-center">
            <p className="text-purple-400 font-semibold text-sm">Withdraw</p>
          </div>
        </div>
      )}
      
      {/* Automatic Execution Flow */}
      {execMode === 'automatic' && (
        <div className="flex flex-col items-center">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-4">
            <p className="text-yellow-400 text-xs font-medium">
              <i className="fa-solid fa-clock mr-1"></i>
              Coming Soon
            </p>
          </div>
          
          <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-4 py-2 text-center opacity-50">
            <p className="text-cyan-400 font-semibold text-sm">Real-time Sports API</p>
            <p className="text-gray-500 text-xs">provider</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 opacity-50"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs opacity-50"></i>
          <span className="text-gray-500 text-xs opacity-50">trigger</span>
          
          <div className="mt-2 bg-orange-500/20 border border-orange-500/40 rounded-lg px-4 py-2 text-center opacity-50">
            <p className="text-orange-400 font-semibold text-sm">Select Winner</p>
          </div>
          
          <div className="w-0.5 h-4 bg-gray-600 mt-2 opacity-50"></div>
          <i className="fa-solid fa-chevron-down text-gray-600 text-xs opacity-50"></i>
          
          <div className="mt-2 bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 text-center opacity-50">
            <p className="text-purple-400 font-semibold text-sm">Withdraw</p>
          </div>
        </div>
      )}
    </div>

    {/* Pool Flowchart */}
    <div className="border-t border-white/10 pt-4 mt-8">
      <h3 className="text-white font-semibold mb-4">Pool:</h3>
      
      <div className="flex flex-col items-center">
        {/* Deposit Owner - Top */}
        <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 text-center">
          <p className="text-blue-400 font-semibold text-sm">Deposit Owner</p>
        </div>
        
        <div className="w-0.5 h-4 bg-gray-600"></div>
        <i className="fa-solid fa-chevron-down text-gray-600 text-xs"></i>
        
        {/* Pool Center with Left/Right arrows */}
        <div className="flex items-center mt-2">
          {/* Left - User bet Team A */}
          <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-3 py-2 text-center">
            <p className="text-green-400 font-semibold text-xs">User bet</p>
            <p className="text-green-400 font-semibold text-xs">Team A</p>
          </div>
          
          <div className="h-0.5 w-4 bg-gray-600"></div>
          <i className="fa-solid fa-chevron-right text-gray-600 text-xs"></i>
          
          {/* Pool Center */}
          <div className="mx-2 bg-[#69d169]/20 border border-[#69d169]/40 rounded-lg px-6 py-3 text-center">
            <p className="text-[#69d169] font-semibold text-sm">Pool</p>
          </div>
          
          <i className="fa-solid fa-chevron-left text-gray-600 text-xs"></i>
          <div className="h-0.5 w-4 bg-gray-600"></div>
          
          {/* Right - User bet Team B */}
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2 text-center">
            <p className="text-red-400 font-semibold text-xs">User bet</p>
            <p className="text-red-400 font-semibold text-xs">Team B</p>
          </div>
        </div>
        
        <i className="fa-solid fa-chevron-up text-gray-600 text-xs mt-2"></i>
        <div className="w-0.5 h-4 bg-gray-600"></div>
        
        {/* Bottom - User bet Draw */}
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-2 text-center">
          <p className="text-yellow-400 font-semibold text-xs">User bet</p>
          <p className="text-yellow-400 font-semibold text-xs">Draw</p>
        </div>
      </div>
      
      {/* Pool Explanation */}
      <div className="mt-6 space-y-3 pl-4">
        <div>
          <p className="text-white text-sm font-medium">Fixed Odds System</p>
          <p className="text-gray-400 text-xs">Odds are set by the owner when creating a match and remain fixed throughout the betting period. Users know exactly how much they can win before placing a bet.</p>
        </div>
        
        <div>
          <p className="text-white text-sm font-medium">Pool Mechanism</p>
          <p className="text-gray-400 text-xs">Owner deposits initial liquidity to guarantee payouts. All user bets flow into the same pool. When the match ends, winners are paid from the pool based on their bet amount × odds.</p>
        </div>
        
        <div>
          <p className="text-white text-sm font-medium">Payout Example</p>
          <p className="text-gray-400 text-xs">User bets 10 MNT on Team A at 2.5x odds → If Team A wins, user receives 25 MNT (10 × 2.5) from the pool.</p>
        </div>
      </div>
    </div>

    {/* Betting Rules */}
    <div className="border-t border-white/10 pt-4 mt-8">
      <h3 className="text-white font-semibold mb-4">Betting Rules:</h3>
      
      <div className="space-y-3 pl-4">
        <div>
          <p className="text-white text-sm font-medium">Upcoming Matches Only</p>
          <p className="text-gray-400 text-xs">Users can only place bets on matches with "Upcoming" status. Once a match starts or ends, betting is closed.</p>
        </div>
        
        <div>
          <p className="text-white text-sm font-medium">10-Minute Cutoff</p>
          <p className="text-gray-400 text-xs">Betting closes 10 minutes before the match starts. Any bet attempts after this cutoff will fail and the transaction will be reverted.</p>
        </div>
        
        <div>
          <p className="text-white text-sm font-medium">Multiple Bets Allowed</p>
          <p className="text-gray-400 text-xs">You can bet on more than one outcome in the same match. For example, you can bet on Team A and also bet on Team B or even Draw.</p>
        </div>
        
        <div>
          <p className="text-white text-sm font-medium">No Cancellation</p>
          <p className="text-gray-400 text-xs">Once a bet is placed, it cannot be cancelled or modified. Make sure to review your bet before confirming.</p>
        </div>
      </div>
    </div>

    {/* Contract Functions Reference */}
    <div className="border-t border-white/10 pt-4 mt-8">
      <h3 className="text-white font-semibold mb-4">Contract Functions:</h3>
      
      <div className="pl-4">
        {/* MasterFactory */}
        <div className="mb-4">
          <h4 className="text-blue-400 font-semibold text-sm mb-2">MasterFactory.sol</h4>
          <div className="space-y-2 pl-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">addFactory()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Register existing factory</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">getActiveFactories()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Get all active factories</span>
            </div>
          </div>
        </div>
        
        {/* SportsBettingFactory */}
        <div className="mb-4">
          <h4 className="text-purple-400 font-semibold text-sm mb-2">SportsBettingFactory.sol</h4>
          <div className="space-y-2 pl-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">createMatchWithDraw()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Create match with 3 outcomes (Team A, Draw, Team B)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">createMatchNoDraw()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Create match with 2 outcomes (Team A, Team B)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">setStakingAddresses()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Set staking for revenue share</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">getAllMatchesWithDraw()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Get all matches with draw</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">getAllMatchesNoDraw()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Get all matches without draw</span>
            </div>
          </div>
        </div>
        
        {/* Match Contracts */}
        <div>
          <h4 className="text-orange-400 font-semibold text-sm mb-2">MatchWithDraw.sol / MatchNoDraw.sol</h4>
          <div className="space-y-2 pl-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">depositLiquidity()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Owner deposits initial liquidity</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">bet()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">User places bet on outcome</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">finalizeResult()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Owner sets match result</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">claim()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">User claims winnings</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
              <code className="text-[#69d169] text-xs bg-black/50 px-1.5 py-0.5 rounded w-fit">withdrawProfit()</code>
              <span className="text-gray-400 text-xs mt-1 pl-2 sm:pl-0 sm:mt-0">Owner withdraws profit + revenue share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const ContractsSection = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">Smart Contracts</h1>
    <p className="text-gray-400">
      All contracts are deployed on Mantle Testnet and verified on Blockscout.
    </p>

    {/* Staking Contracts */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-lg font-semibold text-white mb-4">Staking Contracts</h3>
      <div className="space-y-4">
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">NativeStaking.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Stake MNT to earn 14% APY + 15% revenue share from betting profits</p>
        </div>
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">TokenStakingNativeReward.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Stake ERC20 tokens (INTEL) to earn APY + revenue share</p>
        </div>
      </div>
    </div>

    {/* Betting Contracts */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-lg font-semibold text-white mb-4">Betting Contracts</h3>
      <div className="space-y-4">
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">MasterFactory.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Central registry to manage and track all SportsBettingFactory contracts</p>
        </div>
        
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">SportsBettingFactory.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Creates and manages betting matches, handles staking integration for revenue share</p>
        </div>
        
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">MatchWithDraw.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Match contract with Team A, Draw, Team B options (e.g., Football)</p>
        </div>
        
        <div className="group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60"></div>
            <h4 className="text-white font-semibold text-sm">MatchNoDraw.sol</h4>
          </div>
          <p className="text-gray-400 text-xs pl-4">Match contract with Team A, Team B options only (e.g., Basketball, Tennis)</p>
        </div>
      </div>
    </div>

    {/* Contract Addresses */}
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-lg font-semibold text-white mb-4">Deployed Addresses</h3>
      <div className="space-y-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-gray-500 w-48">NativeStaking:</span>
          <a 
            href="https://sepolia.mantlescan.xyz/address/0xa4D076bEfD5cB7fFcDdB45ba650FC2B619153eE4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#69d169] break-all hover:underline"
          >
            0x6a9f145369B37FD34B0B079E22294CcD0126eD3A
          </a>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-gray-500 w-48">TokenStakingNativeReward:</span>
          <a 
            href="https://sepolia.mantlescan.xyz/address/0xC4ae43DBB174E1d8742Ed78f1b4e9A54314A693C" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#69d169] break-all hover:underline"
          >
            0x37174CbFaf4C595b113E5556a3eb64e35516a9ef
          </a>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-gray-500 w-48">MasterFactory:</span>
          <a 
            href="https://sepolia.mantlescan.xyz/address/0xd2Bf50640E601060a35303e0A4cbE5aDaD8eD394" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#69d169] break-all hover:underline"
          >
            0xFD8781340934aBCA7F205992B7316304A6c9f242
          </a>
        </div>
      </div>
    </div>
  </div>
);

const DocsPage = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme(rainbowTheme)}>
          <Web3Provider>
            <div className="min-h-screen" style={{ position: 'relative' }}>
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
                <GridScan sensitivity={0.55} lineThickness={1} linesColor="#69d169" gridScale={0.08} scanColor="#69d169" scanOpacity={0.6} />
              </div>
              <DocsContent />
            </div>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default DocsPage;
