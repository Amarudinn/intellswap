import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { addresses, erc20Abi, factoryAbi, pairAbi, defaultToken } from '../config/constants';
import TokenSelectModal from './TokenSelectModal';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { formatBalance, formatSwapAmount } from '../utils/formatBalance';

const PositionCard = ({ position, isExpanded, onToggle, getDetails, onAddMore, onRemove }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && !details) {
      setLoading(true);
      getDetails(position).then(data => {
        setDetails(data);
        setLoading(false);
      });
    }
  }, [isExpanded]);

  return (
    <div className="bg-[#0a0a0a]/70 rounded-2xl overflow-hidden border border-white/10">
      <button
        onClick={onToggle}
        className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <img src={position.tokenA.logoURI} className="w-6 h-6 rounded-full" alt={position.tokenA.symbol} />
          <span className="text-white font-semibold">{position.tokenA.symbol}</span>
          <span className="text-gray-400">/</span>
          <img src={position.tokenB.logoURI} className="w-6 h-6 rounded-full" alt={position.tokenB.symbol} />
          <span className="text-white font-semibold">{position.tokenB.symbol}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 border-t border-white/10">
          {loading ? (
            <div className="text-center py-4">
              <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
            </div>
          ) : details ? (
            <div className="space-y-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Pooled {position.tokenA.symbol}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{formatBalance(details.amountA)}</span>
                  <img src={position.tokenA.logoURI} className="w-4 h-4 rounded-full" alt={position.tokenA.symbol} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Pooled {position.tokenB.symbol}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{formatBalance(details.amountB)}</span>
                  <img src={position.tokenB.logoURI} className="w-4 h-4 rounded-full" alt={position.tokenB.symbol} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Your pool share</span>
                <span className="text-white font-medium">{details.sharePercent}%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-gray-400 text-sm">LP Tokens</span>
                <span className="text-white font-medium">{formatBalance(position.lpBalance)}</span>
              </div>
              
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => onAddMore(position)}
                  className="flex-1 btn btn-primary text-sm py-2"
                >
                  <i className="fa-solid fa-plus mr-2"></i>Add
                </button>
                <button
                  onClick={() => onRemove(position)}
                  className="flex-1 btn btn-primary text-sm py-2"
                >
                  <i className="fa-solid fa-minus mr-2"></i>Remove
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">Failed to load details</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PoolTab = ({ showAlert, slippage }) => {
  const { signer, userAddress, routerContract, provider, refreshBalances } = useWeb3();
  const [view, setView] = useState('list'); // 'list', 'add', 'remove'
  const [tokenA, setTokenA] = useState(defaultToken);
  const [tokenB, setTokenB] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [selectingFor, setSelectingFor] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);
  const [liquidityPositions, setLiquidityPositions] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeInput, setActiveInput] = useState('A');
  const [isScanning, setIsScanning] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [removePercent, setRemovePercent] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeEstimate, setRemoveEstimate] = useState(null);

  const { balance: balanceA, formattedBalance: balanceAFormatted } = useTokenBalance(tokenA?.address);
  const { balance: balanceB, formattedBalance: balanceBFormatted } = useTokenBalance(tokenB?.address);

  useEffect(() => {
    if (tokenA && tokenB && (amountA || amountB) && provider) {
      calculatePoolQuote();
    }
  }, [amountA, amountB, tokenA, tokenB, activeInput]);

  useEffect(() => {
    if (signer) {
      loadLiquidityPositions();
    }
  }, [signer]);

  const calculatePoolQuote = async () => {
    try {
      const factoryContract = new ethers.Contract(addresses.factory, factoryAbi, provider);
      const pairAddress = await factoryContract.getPair(tokenA.address, tokenB.address);

      if (pairAddress === ethers.ZeroAddress) {
        setPoolInfo(null);
        return;
      }

      const pairContract = new ethers.Contract(pairAddress, pairAbi, provider);
      const reserves = await pairContract.getReserves();
      const token0Address = await pairContract.token0();

      const [token0, token1] = token0Address.toLowerCase() === tokenA.address.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
      const [reserve0, reserve1] = token0Address.toLowerCase() === tokenA.address.toLowerCase()
        ? [reserves[0], reserves[1]]
        : [reserves[1], reserves[0]];

      if (activeInput === 'A' && amountA) {
        const amountAParsed = ethers.parseUnits(amountA, tokenA.decimals);
        const amountBCalculated = (amountAParsed * reserve1) / reserve0;
        setAmountB(ethers.formatUnits(amountBCalculated, tokenB.decimals));
      } else if (activeInput === 'B' && amountB) {
        const amountBParsed = ethers.parseUnits(amountB, tokenB.decimals);
        const amountACalculated = (amountBParsed * reserve0) / reserve1;
        setAmountA(ethers.formatUnits(amountACalculated, tokenA.decimals));
      }

      const priceAPerB = parseFloat(ethers.formatUnits(reserve1, tokenB.decimals)) / parseFloat(ethers.formatUnits(reserve0, tokenA.decimals));
      const priceBPerA = parseFloat(ethers.formatUnits(reserve0, tokenA.decimals)) / parseFloat(ethers.formatUnits(reserve1, tokenB.decimals));

      let poolShare = 0;
      if (amountA && amountB) {
        const totalSupply = await pairContract.totalSupply();
        if (totalSupply > 0n) {
          const amountADesired = ethers.parseUnits(amountA, tokenA.decimals);
          const liquidity = (amountADesired * totalSupply) / reserve0;
          poolShare = (parseFloat(ethers.formatUnits(liquidity, 18)) / (parseFloat(ethers.formatUnits(totalSupply, 18)) + parseFloat(ethers.formatUnits(liquidity, 18)))) * 100;
        }
      }

      setPoolInfo({
        priceAPerB: formatSwapAmount(priceAPerB),
        priceBPerA: formatSwapAmount(priceBPerA),
        poolShare: formatSwapAmount(poolShare),
        pairAddress
      });
    } catch (error) {
      console.error('Error calculating pool quote:', error);
    }
  };

  const getPositionDetails = async (position) => {
    try {
      const pairContract = new ethers.Contract(position.pairAddress, pairAbi, provider);
      const [reserves, totalSupply, token0Address] = await Promise.all([
        pairContract.getReserves(),
        pairContract.totalSupply(),
        pairContract.token0()
      ]);

      const lpBalance = ethers.parseUnits(position.lpBalance, 18);
      const [reserve0, reserve1] = reserves;

      // Calculate user's share
      const share = (lpBalance * BigInt(10000)) / totalSupply;
      
      // Determine which token is token0 and token1
      const isToken0A = token0Address.toLowerCase() === position.tokenA.address.toLowerCase();
      const [reserveA, reserveB] = isToken0A ? [reserve0, reserve1] : [reserve1, reserve0];

      // Calculate user's token amounts
      const amountA = (reserveA * lpBalance) / totalSupply;
      const amountB = (reserveB * lpBalance) / totalSupply;

      return {
        amountA: ethers.formatUnits(amountA, position.tokenA.decimals),
        amountB: ethers.formatUnits(amountB, position.tokenB.decimals),
        sharePercent: formatSwapAmount(Number(share) / 100)
      };
    } catch (error) {
      console.error('Error getting position details:', error);
      return null;
    }
  };

  const loadLiquidityPositions = async () => {
    if (!signer || !provider || !userAddress) return;

    setIsScanning(true);
    try {
      const factoryContract = new ethers.Contract(addresses.factory, factoryAbi, provider);
      const positions = [];

      console.log('📡 Scanning all token combinations for:', userAddress);
      
      // Use embedded token list from constants
      const { embeddedTokenListData } = await import('../config/constants');
      const allTokens = [defaultToken, ...embeddedTokenListData.tokens];
      
      // Check all possible pairs
      for (let i = 0; i < allTokens.length; i++) {
        for (let j = i + 1; j < allTokens.length; j++) {
          const tokenA = allTokens[i];
          const tokenB = allTokens[j];
          
          try {
            const pairAddress = await factoryContract.getPair(tokenA.address, tokenB.address);
            
            if (pairAddress !== ethers.ZeroAddress) {
              const pairContract = new ethers.Contract(pairAddress, pairAbi, provider);
              const lpBalance = await pairContract.balanceOf(userAddress);
              
              if (lpBalance > 0n) {
                console.log(`✨ Found LP position: ${tokenA.symbol}/${tokenB.symbol}`);
                positions.push({
                  tokenA,
                  tokenB,
                  lpBalance: ethers.formatUnits(lpBalance, 18),
                  pairAddress
                });
              }
            }
          } catch (pairError) {
            // Skip if pair check fails
            continue;
          }
        }
      }

      console.log('✅ Final positions:', positions);
      setLiquidityPositions(positions);
    } catch (error) {
      console.error('Error loading liquidity positions:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddMoreLiquidity = (position) => {
    setTokenA(position.tokenA);
    setTokenB(position.tokenB);
    setView('add');
  };

  const handleRemoveLiquidity = (position) => {
    setSelectedPosition(position);
    setView('remove');
  };

  const handleAddLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !amountA || !amountB) return;

    setIsAdding(true);
    try {
      const amountADesired = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBDesired = ethers.parseUnits(amountB, tokenB.decimals);
      const amountAMin = amountADesired - (amountADesired * BigInt(Math.floor(slippage * 100))) / BigInt(10000);
      const amountBMin = amountBDesired - (amountBDesired * BigInt(Math.floor(slippage * 100))) / BigInt(10000);
      
      // Get current block timestamp and add 30 minutes
      const block = await provider.getBlock('latest');
      const deadline = block.timestamp + 1800; // 30 minutes from now

      const isAETH = tokenA.address.toLowerCase() === addresses.weth.toLowerCase();
      const isBETH = tokenB.address.toLowerCase() === addresses.weth.toLowerCase();

      if (isAETH || isBETH) {
        const [nativeToken, otherToken, nativeAmount, otherAmount, otherAmountMin] = isAETH
          ? [tokenA, tokenB, amountADesired, amountBDesired, amountBMin]
          : [tokenB, tokenA, amountBDesired, amountADesired, amountAMin];

        if (!isAETH) {
          const tokenContract = new ethers.Contract(tokenA.address, erc20Abi, signer);
          const allowance = await tokenContract.allowance(userAddress, addresses.router);
          if (allowance < amountADesired) {
            showAlert(`Approving ${tokenA.symbol}...`, 'info');
            const approveTx = await tokenContract.approve(addresses.router, ethers.MaxUint256);
            await approveTx.wait();
          }
        }

        if (!isBETH) {
          const tokenContract = new ethers.Contract(tokenB.address, erc20Abi, signer);
          const allowance = await tokenContract.allowance(userAddress, addresses.router);
          if (allowance < amountBDesired) {
            showAlert(`Approving ${tokenB.symbol}...`, 'info');
            const approveTx = await tokenContract.approve(addresses.router, ethers.MaxUint256);
            await approveTx.wait();
          }
        }

        showAlert('Adding liquidity...', 'info');
        const tx = await routerContract.addLiquidityETH(
          otherToken.address,
          otherAmount,
          otherAmountMin,
          nativeAmount - (nativeAmount * BigInt(Math.floor(slippage * 100))) / BigInt(10000),
          userAddress,
          deadline,
          { value: nativeAmount }
        );
        await tx.wait();
        showAlert('Liquidity added successfully!', 'success', tx.hash);
      } else {
        const tokenAContract = new ethers.Contract(tokenA.address, erc20Abi, signer);
        const allowanceA = await tokenAContract.allowance(userAddress, addresses.router);
        if (allowanceA < amountADesired) {
          showAlert(`Approving ${tokenA.symbol}...`, 'info');
          const approveTx = await tokenAContract.approve(addresses.router, ethers.MaxUint256);
          await approveTx.wait();
        }

        const tokenBContract = new ethers.Contract(tokenB.address, erc20Abi, signer);
        const allowanceB = await tokenBContract.allowance(userAddress, addresses.router);
        if (allowanceB < amountBDesired) {
          showAlert(`Approving ${tokenB.symbol}...`, 'info');
          const approveTx = await tokenBContract.approve(addresses.router, ethers.MaxUint256);
          await approveTx.wait();
        }

        showAlert('Adding liquidity...', 'info');
        const tx = await routerContract.addLiquidity(
          tokenA.address,
          tokenB.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          userAddress,
          deadline
        );
        await tx.wait();
        showAlert('Liquidity added successfully!', 'success', tx.hash);
      }

      setAmountA('');
      setAmountB('');
      refreshBalances(); // Refresh all balances
      loadLiquidityPositions();
      setView('list');
    } catch (error) {
      console.error('Add liquidity error:', error);
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message?.includes('user rejected') || error.message?.includes('User denied')) {
        showAlert('User rejected', 'error');
      } else {
        showAlert('Failed to add liquidity', 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handlePercentClick = (percent) => {
    setRemovePercent(percent);
  };

  useEffect(() => {
    if (selectedPosition && removePercent > 0 && provider) {
      calculateRemoveEstimate();
    } else {
      setRemoveEstimate(null);
    }
  }, [selectedPosition, removePercent]);

  const calculateRemoveEstimate = async () => {
    try {
      const pairContract = new ethers.Contract(selectedPosition.pairAddress, pairAbi, provider);
      const [reserves, totalSupply, token0Address] = await Promise.all([
        pairContract.getReserves(),
        pairContract.totalSupply(),
        pairContract.token0()
      ]);

      const lpBalance = ethers.parseUnits(selectedPosition.lpBalance, 18);
      const lpToRemove = (lpBalance * BigInt(removePercent)) / BigInt(100);
      const [reserve0, reserve1] = reserves;

      // Determine which token is token0 and token1
      const isToken0A = token0Address.toLowerCase() === selectedPosition.tokenA.address.toLowerCase();
      const [reserveA, reserveB] = isToken0A ? [reserve0, reserve1] : [reserve1, reserve0];

      // Calculate token amounts to receive
      const amountA = (reserveA * lpToRemove) / totalSupply;
      const amountB = (reserveB * lpToRemove) / totalSupply;

      setRemoveEstimate({
        amountA: ethers.formatUnits(amountA, selectedPosition.tokenA.decimals),
        amountB: ethers.formatUnits(amountB, selectedPosition.tokenB.decimals)
      });
    } catch (error) {
      console.error('Error calculating remove estimate:', error);
      setRemoveEstimate(null);
    }
  };

  const handleRemove = async () => {
    if (!signer || !selectedPosition || removePercent === 0 || !removeEstimate) return;

    setIsRemoving(true);
    try {
      const lpBalance = ethers.parseUnits(selectedPosition.lpBalance, 18);
      const liquidity = (lpBalance * BigInt(removePercent)) / BigInt(100);
      
      const amountAMin = ethers.parseUnits(removeEstimate.amountA, selectedPosition.tokenA.decimals);
      const amountBMin = ethers.parseUnits(removeEstimate.amountB, selectedPosition.tokenB.decimals);
      
      // Apply slippage tolerance
      const amountAMinWithSlippage = amountAMin - (amountAMin * BigInt(Math.floor(slippage * 100))) / BigInt(10000);
      const amountBMinWithSlippage = amountBMin - (amountBMin * BigInt(Math.floor(slippage * 100))) / BigInt(10000);
      
      // Get current block timestamp and add 30 minutes
      const block = await provider.getBlock('latest');
      const deadline = block.timestamp + 1800; // 30 minutes from now

      // Approve LP tokens
      console.log('🔍 Checking pair contract:', selectedPosition.pairAddress);
      const pairContract = new ethers.Contract(selectedPosition.pairAddress, pairAbi, signer);
      
      // Verify pair contract exists
      try {
        const code = await provider.getCode(selectedPosition.pairAddress);
        if (code === '0x') {
          throw new Error('Pair contract not found at address');
        }
        console.log('✅ Pair contract exists');
      } catch (error) {
        console.error('❌ Pair contract validation failed:', error);
        throw new Error('Invalid pair contract address');
      }
      
      let allowance;
      try {
        allowance = await pairContract.allowance(userAddress, addresses.router);
        console.log('✅ Current allowance:', ethers.formatUnits(allowance, 18));
      } catch (error) {
        console.error('❌ Failed to check allowance:', error);
        // If allowance check fails, assume we need to approve
        allowance = 0n;
      }
      
      if (allowance < liquidity) {
        showAlert('Approving LP tokens...', 'info');
        const approveTx = await pairContract.approve(addresses.router, ethers.MaxUint256);
        await approveTx.wait();
        showAlert('LP tokens approved!', 'success');
      }

      const isAETH = selectedPosition.tokenA.address.toLowerCase() === addresses.weth.toLowerCase();
      const isBETH = selectedPosition.tokenB.address.toLowerCase() === addresses.weth.toLowerCase();

      showAlert('Removing liquidity...', 'info');

      let tx;
      if (isAETH || isBETH) {
        const [tokenAddress, tokenMin, ethMin] = isAETH
          ? [selectedPosition.tokenB.address, amountBMinWithSlippage, amountAMinWithSlippage]
          : [selectedPosition.tokenA.address, amountAMinWithSlippage, amountBMinWithSlippage];

        tx = await routerContract.removeLiquidityETH(
          tokenAddress,
          liquidity,
          tokenMin,
          ethMin,
          userAddress,
          deadline
        );
      } else {
        tx = await routerContract.removeLiquidity(
          selectedPosition.tokenA.address,
          selectedPosition.tokenB.address,
          liquidity,
          amountAMinWithSlippage,
          amountBMinWithSlippage,
          userAddress,
          deadline
        );
      }

      await tx.wait();
      showAlert('Liquidity removed successfully!', 'success', tx.hash);
      
      // Reset and reload
      setRemovePercent(0);
      setRemoveEstimate(null);
      refreshBalances(); // Refresh all balances
      loadLiquidityPositions();
      setView('list');
      setSelectedPosition(null);
    } catch (error) {
      console.error('Remove liquidity error:', error);
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message?.includes('user rejected') || error.message?.includes('User denied')) {
        showAlert('User rejected', 'error');
      } else {
        showAlert('Failed to remove liquidity', 'error');
      }
    } finally {
      setIsRemoving(false);
    }
  };

  if (view === 'remove' && selectedPosition) {
    const lpToRemove = formatBalance(parseFloat(selectedPosition.lpBalance) * removePercent / 100);

    return (
      <>
        <button
          onClick={() => {
            setView('list');
            setSelectedPosition(null);
          }}
          className="mb-4 text-gray-300 hover:text-white transition-colors flex items-center"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>Back to Pool
        </button>

        <div className="bg-[#0a0a0a]/70 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <img src={selectedPosition.tokenA.logoURI} className="w-8 h-8 rounded-full" alt={selectedPosition.tokenA.symbol} />
            <span className="text-white font-bold text-xl">{selectedPosition.tokenA.symbol}</span>
            <span className="text-gray-400 text-xl">/</span>
            <img src={selectedPosition.tokenB.logoURI} className="w-8 h-8 rounded-full" alt={selectedPosition.tokenB.symbol} />
            <span className="text-white font-bold text-xl">{selectedPosition.tokenB.symbol}</span>
          </div>
          
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-2">Amount to remove</p>
            <p className="text-white text-5xl font-bold mb-1">{removePercent}%</p>
            <p className="text-gray-400 text-sm">{lpToRemove} LP tokens</p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <button 
                onClick={() => handlePercentClick(25)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  removePercent === 25 
                    ? 'bg-[#69d169] text-[#1c1c1c]' 
                    : 'bg-black/40 text-gray-400 hover:bg-black/60'
                }`}
              >
                25%
              </button>
              <button 
                onClick={() => handlePercentClick(50)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  removePercent === 50 
                    ? 'bg-[#69d169] text-[#1c1c1c]' 
                    : 'bg-black/40 text-gray-400 hover:bg-black/60'
                }`}
              >
                50%
              </button>
              <button 
                onClick={() => handlePercentClick(75)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  removePercent === 75 
                    ? 'bg-[#69d169] text-[#1c1c1c]' 
                    : 'bg-black/40 text-gray-400 hover:bg-black/60'
                }`}
              >
                75%
              </button>
              <button 
                onClick={() => handlePercentClick(100)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  removePercent === 100 
                    ? 'bg-[#69d169] text-[#1c1c1c]' 
                    : 'bg-black/40 text-gray-400 hover:bg-black/60'
                }`}
              >
                MAX
              </button>
            </div>
            
            <div className="slider-container relative">
              <div 
                className="slider-progress" 
                style={{ width: `${removePercent}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={removePercent}
                onChange={(e) => setRemovePercent(parseInt(e.target.value))}
                className="w-full relative z-10 slider"
              />
            </div>
          </div>
        </div>

        {removePercent > 0 && (
          <div className="bg-[#0a0a0a]/70 rounded-2xl p-4 mb-4">
            <h3 className="text-white font-semibold mb-3">You will receive</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <img src={selectedPosition.tokenA.logoURI} className="w-5 h-5 rounded-full" alt={selectedPosition.tokenA.symbol} />
                  <span className="text-gray-400">{selectedPosition.tokenA.symbol}</span>
                </div>
                <span className="text-white font-medium">
                  {removeEstimate ? formatSwapAmount(removeEstimate.amountA) : '~'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <img src={selectedPosition.tokenB.logoURI} className="w-5 h-5 rounded-full" alt={selectedPosition.tokenB.symbol} />
                  <span className="text-gray-400">{selectedPosition.tokenB.symbol}</span>
                </div>
                <span className="text-white font-medium">
                  {removeEstimate ? formatSwapAmount(removeEstimate.amountB) : '~'}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleRemove}
          disabled={!signer || removePercent === 0 || isRemoving}
          className="btn btn-primary text-lg"
        >
          {!signer ? 'Connect Wallet' : isRemoving ? 'Removing...' : removePercent === 0 ? 'Enter Amount' : 'Remove'}
        </button>
      </>
    );
  }

  if (view === 'add') {
    return (
      <>
        <button
          onClick={() => setView('list')}
          className="mb-4 text-gray-300 hover:text-white transition-colors flex items-center"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>Back to Pool
        </button>

        <div className="relative space-y-1">
          {/* Token A Section */}
          <div className="group bg-[#0a0a0a]/70 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 text-sm font-medium">Token A</span>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setAmountA((parseFloat(balanceA) * 0.5).toString())}
                    className="text-[#69d169] hover:text-[#5bc05b] text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmountA(balanceA)}
                    className="text-[#69d169] hover:text-[#5bc05b] text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg"
                  >
                    100%
                  </button>
                </div>
                <i className="fa-solid fa-wallet text-xs"></i>
                <span>{balanceAFormatted} {tokenA.symbol}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectingFor('poolA')}
                className="flex items-center space-x-2 bg-black/40 hover:bg-black/60 px-3 py-2 rounded-full font-semibold transition-colors"
              >
                <img src={tokenA.logoURI} className="w-6 h-6 rounded-full" alt={tokenA.symbol} />
                <span className="text-white">{tokenA.symbol}</span>
                <i className="fa-solid fa-chevron-down text-xs text-white"></i>
              </button>
              
              <div className="flex flex-col items-end flex-1 ml-4">
                <input
                  type="text"
                  value={amountA}
                  onChange={(e) => {
                    setAmountA(e.target.value);
                    setActiveInput('A');
                  }}
                  placeholder="0.00"
                  className="w-full text-white bg-transparent text-3xl font-bold text-right focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="flex items-center justify-center h-10 w-10 bg-[#1a1a2e] border-2 border-[#2a2a3e] rounded-full text-gray-400">
              <i className="fa-solid fa-plus text-lg"></i>
            </div>
          </div>

          {/* Token B Section */}
          <div className="bg-[#0a0a0a]/70 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 text-sm font-medium">Token B</span>
              {tokenB && (
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <i className="fa-solid fa-wallet text-xs"></i>
                  <span>{balanceBFormatted} {tokenB.symbol}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectingFor('poolB')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold transition-colors ${
                  tokenB ? 'bg-black/40 hover:bg-black/60' : 'bg-[#69d169] hover:bg-[#5bc05b]'
                }`}
              >
                {tokenB ? (
                  <>
                    <img src={tokenB.logoURI} className="w-6 h-6 rounded-full" alt={tokenB.symbol} />
                    <span className="text-white">{tokenB.symbol}</span>
                  </>
                ) : (
                  <span className="text-[#1c1c1c]">Select token</span>
                )}
                <i className={`fa-solid fa-chevron-down text-xs ${tokenB ? 'text-white' : 'text-[#1c1c1c]'}`}></i>
              </button>
              
              <div className="flex flex-col items-end flex-1 ml-4">
                <input
                  type="text"
                  value={amountB}
                  onChange={(e) => {
                    setAmountB(e.target.value);
                    setActiveInput('B');
                  }}
                  placeholder="0.00"
                  className="w-full text-white bg-transparent text-3xl font-bold text-right focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {poolInfo && (
          <div className="text-sm text-gray-300 mt-4 p-3 bg-[#0a0a0a]/70 rounded-lg">
            <h3 className="font-semibold mb-2 text-white">Pool share</h3>
            <div className="flex flex-col md:flex-row md:justify-around text-center space-y-3 md:space-y-0">
              <div>
                <p className="font-bold text-lg text-white">{poolInfo.priceAPerB}</p>
                <p className="text-xs">{tokenB?.symbol} per {tokenA?.symbol}</p>
              </div>
              <div>
                <p className="font-bold text-lg text-white">{poolInfo.priceBPerA}</p>
                <p className="text-xs">{tokenA?.symbol} per {tokenB?.symbol}</p>
              </div>
              <div>
                <p className="font-bold text-lg text-white">{poolInfo.poolShare}%</p>
                <p className="text-xs">Share of Pool</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleAddLiquidity}
          disabled={!signer || !tokenA || !tokenB || !amountA || !amountB || isAdding}
          className="btn btn-primary mt-4 text-lg"
        >
          {!signer ? 'Connect Wallet' : isAdding ? 'Supply...' : 'Supply'}
        </button>

        {selectingFor && (
          <TokenSelectModal
            onClose={() => setSelectingFor(null)}
            onSelect={(token) => {
              // Prevent selecting the same token
              const otherToken = selectingFor === 'poolA' ? tokenB : tokenA;
              if (otherToken && token.address.toLowerCase() === otherToken.address.toLowerCase()) {
                return; // Don't select same token
              }
              
              if (selectingFor === 'poolA') setTokenA(token);
              else setTokenB(token);
              setSelectingFor(null);
            }}
            excludeToken={selectingFor === 'poolA' ? tokenB : tokenA}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setView('add')}
        className="btn btn-primary mb-4 flex items-center justify-center"
      >
        <i className="fa-solid fa-plus mr-2"></i> Add Liquidity
      </button>

      <h2 className="text-lg font-semibold mb-2 text-white">Your Liquidity</h2>
      <div className="space-y-2">
        {isScanning ? (
          <div className="text-center py-8">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-3"></i>
            <p className="text-gray-400 text-sm">Loading positions...</p>
          </div>
        ) : liquidityPositions.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Your liquidity positions will appear here.</p>
        ) : (
          liquidityPositions.map((position, index) => (
            <PositionCard 
              key={index} 
              position={position} 
              isExpanded={expandedPosition === index}
              onToggle={() => setExpandedPosition(expandedPosition === index ? null : index)}
              getDetails={getPositionDetails}
              onAddMore={handleAddMoreLiquidity}
              onRemove={handleRemoveLiquidity}
            />
          ))
        )}
      </div>
    </>
  );
};

export default PoolTab;
