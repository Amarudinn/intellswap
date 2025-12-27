import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { embeddedTokenListData, erc20Abi, addresses } from '../config/constants';
import { formatBalance } from '../utils/formatBalance';
import TokenImage from './TokenImage';

const TokenSelectModal = ({ onClose, onSelect, excludeToken }) => {
  const { provider, userAddress } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [customTokens, setCustomTokens] = useState([]);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade in animation
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const loadTokens = () => {
      const stored = localStorage.getItem('customTokens');
      const custom = stored ? JSON.parse(stored) : [];
      setCustomTokens(custom);
      
      const allTokens = [...embeddedTokenListData.tokens, ...custom];
      setTokens(allTokens);
      setFilteredTokens(allTokens);
    };
    loadTokens();
  }, []);

  useEffect(() => {
    const fetchBalancesAndSort = async () => {
      if (!provider || !userAddress) {
        setFilteredTokens(tokens);
        return;
      }

      try {
        const tokensWithBalances = await Promise.all(
          tokens.map(async (token) => {
            try {
              let balance = '0';
              const checksumAddress = ethers.getAddress(token.address);
              
              if (checksumAddress.toLowerCase() === addresses.weth.toLowerCase()) {
                const bal = await provider.getBalance(userAddress);
                balance = ethers.formatEther(bal);
              } else {
                const tokenContract = new ethers.Contract(checksumAddress, erc20Abi, provider);
                const decimals = await tokenContract.decimals();
                const bal = await tokenContract.balanceOf(userAddress);
                balance = ethers.formatUnits(bal, decimals);
              }
              
              return { ...token, balance };
            } catch (error) {
              return { ...token, balance: '0' };
            }
          })
        );

        tokensWithBalances.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
        setFilteredTokens(tokensWithBalances);
      } catch (error) {
        console.error('Error fetching balances:', error);
        setFilteredTokens(tokens);
      }
    };

    fetchBalancesAndSort();
  }, [tokens, provider, userAddress]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = tokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
    setFilteredTokens(filtered);
  }, [searchQuery, tokens]);

  const handleImportToken = async () => {
    if (!ethers.isAddress(searchQuery)) return;

    try {
      const tokenContract = new ethers.Contract(searchQuery, erc20Abi, provider);
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);

      const newToken = {
        address: ethers.getAddress(searchQuery),
        name,
        symbol,
        decimals,
        logoURI: 'https://placehold.co/40x40/8B5CF6/ffffff?text=' + symbol[0],
        chainId: 5003
      };

      const updated = [...customTokens, newToken];
      setCustomTokens(updated);
      localStorage.setItem('customTokens', JSON.stringify(updated));
      setTokens([...embeddedTokenListData.tokens, ...updated]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error importing token:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Match transition duration
  };

  const handleSelectToken = (token) => {
    setIsVisible(false);
    setTimeout(() => {
      onSelect(token);
    }, 200); // Match transition duration
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black backdrop-blur-sm z-[100] cursor-pointer transition-opacity duration-200 ${
          isVisible ? 'opacity-60' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Copied Toast */}
      {copiedAddress && (
        <div className="fixed top-20 left-0 right-0 z-[102] flex justify-center animate-fade-in">
          <div className="bg-[#69d169] text-[#1c1c1c] rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg font-semibold">
            <i className="fa-solid fa-check"></i>
            <span>Copied to clipboard</span>
          </div>
        </div>
      )}
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div 
          className={`bg-[#141414] rounded-2xl w-full max-w-md border border-white/10 pointer-events-auto transition-all duration-200 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg text-white font-semibold">Select a token</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl transition-colors">
            &times;
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="w-full bg-black/20 text-white p-3 pl-10 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#69d169] focus:outline-none transition-all"
            />
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
          
          {/* Popular Tokens */}
          <div className="mt-3">
            <div className="flex items-center space-x-2 mb-2 flex-wrap gap-2">
              <button
                onClick={() => {
                  const nexToken = {
                    address: '0xf42548Ba89dc2314408f44b16506F88769abDED5',
                    symbol: 'MNT',
                    name: 'Mantle Testnet',
                    logoURI: 'https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040',
                    decimals: 18
                  };
                  handleSelectToken(nexToken);
                }}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
              >
                <TokenImage src="https://cryptologos.cc/logos/mantle-mnt-logo.svg?v=040" alt="MNT" className="w-5 h-5 rounded-full" />
                <span className="text-white text-sm font-semibold">MNT</span>
                <i className="fa-solid fa-circle-check text-[#69d169] text-xs"></i>
              </button>
              
              <button
                onClick={() => {
                  const tokenA = {
                    address: '0xE1010F50c511938699fDcac5520b0AdEd090b922',
                    symbol: 'USDC',
                    name: 'USDC',
                    logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040',
                    decimals: 18
                  };
                  handleSelectToken(tokenA);
                }}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
              >
                <TokenImage src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040" alt="A" className="w-5 h-5 rounded-full" />
                <span className="text-white text-sm font-semibold">USDC</span>
                <i className="fa-solid fa-circle-check text-[#69d169] text-xs"></i>
              </button>
              
              <button
                onClick={() => {
                  const tokenB = {
                    address: '0xBd5447Ff67852627c841bC695b99626BB60AcC8a',
                    symbol: 'INTEL',
                    name: 'IntellSwap',
                    logoURI: '/nxs.svg',
                    decimals: 18
                  };
                  handleSelectToken(tokenB);
                }}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
              >
                <TokenImage src="/nxs.svg" alt="B" className="w-5 h-5 rounded-full" />
                <span className="text-white text-sm font-semibold">INTEL</span>
                <i className="fa-solid fa-circle-check text-[#69d169] text-xs"></i>
              </button>
            </div>
            
            {/* Divider */}
            <div className="border-t border-white/10 -mb-2"></div>
          </div>
          
          {ethers.isAddress(searchQuery) && !tokens.find(t => t.address.toLowerCase() === searchQuery.toLowerCase()) && (
            <button
              onClick={handleImportToken}
              className="mt-2 w-full btn btn-secondary text-sm"
            >
              Import Token
            </button>
          )}
        </div>

        <div className="token-list max-h-96 overflow-y-auto px-2 pb-2">
          {filteredTokens.length === 0 ? (
            <p className="text-gray-400 p-4 text-center">No tokens found</p>
          ) : (
            filteredTokens.map((token) => {
              const isExcluded = excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase();
              
              return (
              <button
                key={token.address}
                onClick={() => !isExcluded && handleSelectToken(token)}
                disabled={isExcluded}
                className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  isExcluded 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <TokenImage
                    src={token.logoURI}
                    alt={token.symbol}
                    className="w-8 h-8 mr-4 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{token.symbol}</p>
                    <div className="flex items-center space-x-2 leading-none">
                      <p className="text-sm text-gray-400 leading-none">{token.name}</p>
                      <p className="text-xs text-gray-500 leading-none">
                        {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(token.address);
                          setCopiedAddress(token.address);
                          setTimeout(() => setCopiedAddress(null), 2000);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white flex items-center"
                        title="Copy address"
                      >
                        <i className="fa-regular fa-clone text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
                {token.balance && parseFloat(token.balance) > 0 && (
                  <div className="text-gray-300 ml-2 flex-shrink-0">
                    {formatBalance(token.balance)}
                  </div>
                )}
              </button>
            );
            })
          )}
        </div>
      </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default TokenSelectModal;
